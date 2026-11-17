import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './lib/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const started = Date.now();
const { pages } = build(root);
console.log(`Built ${pages} pages into public/ (${Date.now() - started} ms)`);
