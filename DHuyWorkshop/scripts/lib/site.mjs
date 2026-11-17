import fs from 'node:fs';
import path from 'node:path';
import { parseFrontMatter, renderMarkdown } from './markdown.mjs';
import { createRenderer } from './template.mjs';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function loadConfig(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  config.baseURL = (config.baseURL || '').replace(/\/+$/, '');
  return config;
}

function readPage(file, url, fallbackTitle) {
  const { data, body } = file && fs.existsSync(file) ? parseFrontMatter(fs.readFileSync(file, 'utf8')) : { data: {}, body: '' };
  return {
    file,
    url,
    fm: data,
    title: String(data.title ?? fallbackTitle),
    menuTitle: String(data.menuTitle ?? data.title ?? fallbackTitle),
    pre: String(data.pre ?? '').replace(/<[^>]*>/g, '').trim() ? String(data.pre).replace(/<[^>]*>/g, '').trim() + ' ' : '',
    weight: typeof data.weight === 'number' ? data.weight : 999,
    draft: data.draft === true,
    markdown: body,
    children: [],
    parent: null,
  };
}

function loadSection(dir, urlParts, fallbackTitle) {
  const url = `/${urlParts.length ? `${urlParts.join('/')}/` : ''}`;
  const node = readPage(path.join(dir, '_index.md'), url, fallbackTitle);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    let child;
    if (entry.isDirectory()) {
      child = loadSection(path.join(dir, entry.name), [...urlParts, entry.name], entry.name);
    } else if (entry.name.endsWith('.md') && entry.name !== '_index.md' && !/\.[a-z]{2}\.md$/.test(entry.name)) {
      const slug = entry.name.replace(/\.md$/, '');
      child = readPage(path.join(dir, entry.name), `${url}${slug}/`, slug);
    }
    if (child && !child.draft) {
      child.parent = node;
      node.children.push(child);
    }
  }
  node.children.sort((a, b) => a.weight - b.weight || a.url.localeCompare(b.url, 'vi', { numeric: true }));
  return node;
}

function flatten(node, list = []) {
  list.push(node);
  node.children.forEach((c) => flatten(c, list));
  return list;
}

const isAncestorOrSelf = (node, current) => {
  for (let n = current; n; n = n.parent) if (n === node) return true;
  return false;
};

function navHtml(root, current, base) {
  const build = (nodes) =>
    `<ul>${nodes
      .map((n) => {
        const isCurrent = n === current;
        const open = isAncestorOrSelf(n, current);
        const label = `${n.pre}${n.menuTitle}`;
        const cls = ['nav-item', n.parent === root ? 'nav-top' : 'nav-child', isCurrent && 'is-current', !isCurrent && open && 'is-parent-active']
          .filter(Boolean)
          .join(' ');
        const sub = n.children.length
          ? `<div class="nav-children${open ? '' : ' nav-collapsed'}">${build(n.children)}</div>`
          : '';
        return `<li class="${cls}" data-search="${esc(label.toLowerCase())}"><a href="${base}${n.url}"${isCurrent ? ' aria-current="page"' : ''}>${n.pre ? `<b>${esc(n.pre)}</b>` : ''}${esc(n.menuTitle)}</a>${sub}</li>`;
      })
      .join('')}</ul>`;
  return build(root.children);
}

function breadcrumbHtml(current, base) {
  if (!current.parent) return '';
  const chain = [];
  for (let n = current; n; n = n.parent) chain.unshift(n);
  return `<div class="breadcrumb">${chain
    .map((n) =>
      n === current
        ? `<span aria-current="page">${esc(n.title)}</span>`
        : `<a href="${base}${n.url}">${esc(n.title)}</a><span aria-hidden="true">›</span>`,
    )
    .join('')}</div>`;
}

function formatDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

export function build(root) {
  const config = loadConfig(root);
  const base = config.baseURL;
  const publicDir = path.join(root, 'public');
  const renderer = createRenderer(path.join(root, 'layouts'));

  const home = loadSection(path.join(root, 'content'), [], config.title);
  const pages = flatten(home);

  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.mkdirSync(publicDir, { recursive: true });
  copyDir(path.join(root, 'static'), publicDir);

  const hasAvatar = ['jpg', 'jpeg', 'png', 'webp'].map((e) => `avatar.${e}`).find((f) => fs.existsSync(path.join(root, 'static/images', f)));
  const ICONS = {
    aws: `<img src="${base}/images/aws-logo-white.png" alt="">`,
    facebook: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M22 0H2a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h10.7v-9.3H9.6V11h3.1V8.3c0-3.1 1.9-4.8 4.7-4.8 1.3 0 2.5.1 2.8.1v3.2h-1.9c-1.5 0-1.8.7-1.8 1.8V11h3.6l-.5 3.7h-3.1V24H22a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/></svg>',
  };
  const shortcuts = (config.links || [])
    .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><span class="shortcut-icon" aria-hidden="true">${ICONS[l.icon] || esc(l.icon || '↗')}</span>${esc(l.label)}</a></li>`)
    .join('');
  const reportLinks = `<ol>${home.children.map((n) => `<li><a href="${base}${n.url}">${esc(n.title)}</a></li>`).join('')}</ol>`;

  pages.forEach((page, idx) => {
    const isHome = page === home;
    const ctx = {
      site: config,
      base,
      title: page.title,
      isHome,
      body: renderMarkdown(page.markdown, { base }),
      nav: navHtml(home, page, base),
      breadcrumb: breadcrumbHtml(page, base),
      shortcuts,
      reportLinks,
      avatar: hasAvatar ? `${base}/images/${hasAvatar}` : '',
      lastUpdated: config.lastUpdated || formatDate(new Date()),
      bodyClass: isHome ? 'page-home' : 'page-inner',
      contentClass: isHome ? 'home-content' : 'section-content',
    };
    const prev = pages[idx - 1];
    const next = pages[idx + 1];
    ctx.edgeNav =
      (prev ? `<a class="edge-navigation previous" href="${base}${prev.url}" aria-label="Previous page: ${esc(prev.title)}">‹</a>` : '') +
      (next ? `<a class="edge-navigation next" href="${base}${next.url}" aria-label="Next page: ${esc(next.title)}">›</a>` : '');
    ctx.content = renderer.renderFile(isHome ? 'home.html' : 'page.html', ctx);
    const html = renderer.renderFile('baseof.html', ctx);
    const outFile = path.join(publicDir, page.url, 'index.html');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
  });

  if (fs.existsSync(path.join(root, 'layouts/404.html'))) {
    const ctx404 = { site: config, base, title: 'Page not found', nav: navHtml(home, home, base), shortcuts, lastUpdated: formatDate(new Date()), bodyClass: 'page-inner', contentClass: 'section-content', edgeNav: '', content: renderer.renderFile('404.html', { base }) };
    fs.writeFileSync(path.join(publicDir, '404.html'), renderer.renderFile('baseof.html', ctx404));
  }
  return { pages: pages.length };
}
