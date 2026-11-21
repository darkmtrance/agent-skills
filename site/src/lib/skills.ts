import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = join(process.cwd(), '..');
const SKILLS_DIR = join(ROOT, 'skills');

export const config = JSON.parse(readFileSync(join(ROOT, 'skills.config.json'), 'utf8')) as {
  repo: string;
  branch: string;
  title: string;
  tagline: string;
};

export interface Skill {
  name: string;
  description: string;
  version?: string;
  license?: string;
  author?: string;
  body: string;
  files: string[];
  fileCount: number;
  sizeKB: number;
}

function walk(dir: string, out: number[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(statSync(full).size);
  }
  return out;
}

let cache: Skill[] | undefined;

export function getSkills(): Skill[] {
  if (cache) return cache;
  cache = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map((d) => {
      const dir = join(SKILLS_DIR, d.name);
      const { data, content } = matter(readFileSync(join(dir, 'SKILL.md'), 'utf8'));
      if (!data.name || !data.description) {
        throw new Error(`skills/${d.name}/SKILL.md: faltan "name" o "description" en el frontmatter`);
      }
      if (data.name !== d.name) {
        throw new Error(`skills/${d.name}: el name del frontmatter ("${data.name}") debe coincidir con la carpeta`);
      }
      const sizes = walk(dir);
      const top = readdirSync(dir, { withFileTypes: true })
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
        .sort((a, b) => Number(b.endsWith('/')) - Number(a.endsWith('/')) || a.localeCompare(b));
      const skill: Skill = {
        name: data.name,
        description: String(data.description),
        version: data.version ?? data.metadata?.version,
        license: data.license,
        author: data.author ?? data.metadata?.author,
        body: content,
        files: top,
        fileCount: sizes.length,
        sizeKB: Math.round(sizes.reduce((s, n) => s + n, 0) / 1024),
      };
      return skill;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export const commands = {
  all: () => `npx skills add ${config.repo}`,
  list: () => `npx skills add ${config.repo} --list`,
  one: (name: string) => `npx skills add ${config.repo} --skill ${name}`,
  claude: (name: string) => `npx skills add ${config.repo} --skill ${name} -g -a claude-code`,
  copilot: (name: string) => `npx skills add ${config.repo} --skill ${name} -g -a github-copilot`,
};

export const githubUrl = (name?: string) =>
  `https://github.com/${config.repo}${name ? `/tree/${config.branch}/skills/${name}` : ''}`;

export const shortDescription = (d: string, max = 180) => {
  const first = d.split(/(?<=\.)\s/)[0];
  return first.length <= max ? first : first.slice(0, max).replace(/\s\S*$/, '') + '…';
};
