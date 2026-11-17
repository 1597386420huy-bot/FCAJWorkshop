import fs from 'node:fs';
import path from 'node:path';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const get = (ctx, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);

export function createRenderer(layoutsDir) {
  const read = (rel) => fs.readFileSync(path.join(layoutsDir, rel), 'utf8');

  const render = (tpl, ctx, depth = 0) => {
    if (depth > 8) throw new Error('Partial lồng nhau quá sâu');
    let out = tpl.replace(/\{\{>\s*([\w/-]+)\s*\}\}/g, (_, name) => render(read(`partials/${name}.html`), ctx, depth + 1));
    const ifRe = /\{\{#if\s+([\w.]+)\s*\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/;
    while (ifRe.test(out)) {
      out = out.replace(ifRe, (_, key, inner) => {
        const [yes, no = ''] = inner.split('{{else}}');
        return get(ctx, key) ? yes : no;
      });
    }
    return out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g, (_, raw, safe) =>
      raw ? String(get(ctx, raw) ?? '') : esc(get(ctx, safe)),
    );
  };

  return { renderFile: (rel, ctx) => render(read(rel), ctx) };
}
