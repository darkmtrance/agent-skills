import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('../skills.config.json', import.meta.url), 'utf8'));
const [owner, repo] = cfg.repo.split('/');

// GitHub Pages: https://<owner>.github.io/<repo>/
export default defineConfig({
  site: process.env.SITE_URL ?? `https://${owner.toLowerCase()}.github.io`,
  base: process.env.BASE_PATH ?? `/${repo}`,
  trailingSlash: 'ignore',
});
