const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'muc'
  );
}

export function parseFrontMatter(raw) {
  const text = raw.replace(/^﻿/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    else if (v === 'true') v = true;
    else if (v === 'false') v = false;
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

function fixUrl(url, ctx) {
  return url.startsWith('/') && !url.startsWith('//') ? `${ctx.base || ''}${url}` : url;
}

function inline(text, ctx) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = text.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) =>
    keep(`<img src="${esc(fixUrl(src, ctx))}" alt="${esc(alt)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy">`),
  );
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href) => {
    const external = /^https?:/.test(href);
    return keep(
      `<a href="${esc(fixUrl(href, ctx))}"${external ? ' target="_blank" rel="noopener"' : ''}>${inline(label, ctx)}</a>`,
    );
  });
  s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (_, u) => keep(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`));
  s = s.replace(/<br\s*\/?>/gi, () => keep('<br>'));
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[i]);
}

function renderList(items, ctx) {
  let pos = 0;
  const build = () => {
    const first = items[pos];
    const tag = first.ordered ? 'ol' : 'ul';
    const baseIndent = first.indent;
    let html = `<${tag}>`;
    while (pos < items.length && items[pos].indent >= baseIndent) {
      if (items[pos].indent > baseIndent) {
        html = html.replace(/<\/li>$/, '') + build() + '</li>';
        continue;
      }
      const item = items[pos++];
      html += `<li>${inline(item.text, ctx)}`;
      if (pos < items.length && items[pos].indent > baseIndent) html += build();
      html += '</li>';
    }
    return `${html}</${tag}>`;
  };
  return build();
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const RAW_HTML = /^\s*<\/?(div|section|figure|img|iframe|details|summary|table|p|ul|ol|video|center|span|a)\b/i;

export function renderMarkdown(src, ctx = { base: '' }) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const isBlank = (l) => /^\s*$/.test(l);
  const isSpecial = (l) =>
    /^#{1,6}\s/.test(l) || /^```/.test(l) || LIST_RE.test(l) || /^\s*>/.test(l) || /^\s*\|/.test(l) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(l) || /^\s*<!--/.test(l) || RAW_HTML.test(l);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    let m;

    if ((m = line.match(/^```(\S*)/))) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${m[1] ? ` class="language-${esc(m[1])}"` : ''}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if ((m = line.match(/^(#{1,6})\s+(.*?)\s*$/))) {
      let text = m[2];
      let id;
      const idm = text.match(/^(.*?)\s*\{#([\w-]+)\}$/);
      if (idm) { text = idm[1]; id = idm[2]; }
      out.push(`<h${m[1].length} id="${id || slugify(text)}">${inline(text, ctx)}</h${m[1].length}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^\s*<!--/.test(line)) {
      const buf = [];
      while (i < lines.length) {
        buf.push(lines[i]);
        if (/-->/.test(lines[i++])) break;
      }
      out.push(buf.join('\n'));
      continue;
    }

    if (RAW_HTML.test(line)) {
      const buf = [];
      while (i < lines.length && !isBlank(lines[i])) buf.push(lines[i++]);
      out.push(buf.join('\n').replace(/(src|href)="\/(?!\/)/g, `$1="${ctx.base || ''}/`));
      continue;
    }

    if (/^\s*\|/.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const cells = (l) =>
        l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = cells(line);
      const aligns = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : ''));
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      const cell = (tag, c, k) =>
        `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(c, ctx)}</${tag}>`;
      out.push(
        `<div class="table-wrap"><table class="task-table"><thead><tr>${head.map((c, k) => cell('th', c, k)).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${head.map((_, k) => cell('td', r[k] ?? '', k)).join('')}</tr>`).join('')}</tbody></table></div>`,
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'), ctx)}</blockquote>`);
      continue;
    }

    if (LIST_RE.test(line)) {
      const items = [];
      while (i < lines.length) {
        const lm = lines[i].match(LIST_RE);
        if (lm) {
          items.push({ indent: lm[1].replace(/\t/g, '    ').length, ordered: /\d/.test(lm[2]), text: lm[3] });
          i++;
        } else if (isBlank(lines[i]) && i + 1 < lines.length && LIST_RE.test(lines[i + 1])) {
          i++;
        } else if (/^\s+\S/.test(lines[i]) && items.length && !isSpecial(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i++;
        } else break;
      }
      out.push(renderList(items, ctx));
      continue;
    }

    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && (buf.length === 0 || !isSpecial(lines[i]))) buf.push(lines[i++]);
    const text = buf
      .map((l, k) => (k < buf.length - 1 && /( {2,}|\\)$/.test(l) ? `${l.replace(/( {2,}|\\)$/, '').trim()}<br>` : l.trim()))
      .join(' ');
    out.push(`<p>${inline(text, ctx)}</p>`);
  }
  return out.join('\n');
}
