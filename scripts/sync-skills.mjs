#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const SOURCES_PATH = join(ROOT, 'skills.sources.json');
const IGNORED_ENTRIES = new Set(['.git', 'node_modules', '.DS_Store']);

function parseArgs(argv) {
  const opts = { dryRun: false, summaryFile: null, help: false, skills: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '--check') {
      opts.dryRun = true;
    } else if (arg === '--summary-file') {
      opts.summaryFile = argv[++i];
      if (!opts.summaryFile) throw new Error('--summary-file requiere una ruta');
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Opción desconocida: ${arg}`);
    } else {
      opts.skills.push(arg);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Uso: node scripts/sync-skills.mjs [opciones] [skill...]

Sincroniza los skills externos declarados en skills.sources.json hacia skills/<nombre>/.

Opciones:
  --dry-run, --check       Comprueba cambios sin modificar skills/
  --summary-file <ruta>    Escribe un resumen en Markdown (útil para PRs)
  -h, --help               Muestra esta ayuda

Ejemplos:
  node scripts/sync-skills.mjs
  node scripts/sync-skills.mjs archify
  node scripts/sync-skills.mjs --dry-run`);
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const data = {};
  let currentSection = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const kv = line.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.replace(/^["']|["']$/g, '').trim();

    if (indent === 0) {
      if (value === '') {
        currentSection = key;
        data[key] = {};
      } else {
        currentSection = null;
        data[key] = value;
      }
    } else if (currentSection && typeof data[currentSection] === 'object') {
      data[currentSection][key] = value;
    }
  }
  return data;
}

function readSkillMeta(dir) {
  const skillMd = join(dir, 'SKILL.md');
  if (!existsSync(skillMd)) return null;
  const fm = parseFrontmatter(readFileSync(skillMd, 'utf8'));
  return {
    name: fm.name || null,
    description: fm.description || null,
    version: fm.version || fm.metadata?.version || null,
  };
}

function repoToCloneUrl(repo) {
  if (/^https?:\/\//i.test(repo) || repo.startsWith('git@')) return repo;
  return `https://github.com/${repo}.git`;
}

function repoToWebUrl(repo) {
  if (/^https?:\/\//i.test(repo)) return repo.replace(/\.git$/, '');
  return `https://github.com/${repo}`;
}

function findSkillDir(cloneDir, expectedName, explicitPath) {
  if (explicitPath) {
    const candidate = resolve(cloneDir, explicitPath);
    if (!existsSync(join(candidate, 'SKILL.md'))) {
      throw new Error(`No se encontró SKILL.md en la ruta configurada "${explicitPath}"`);
    }
    return candidate;
  }

  const commonCandidates = [
    join(cloneDir, 'skills', expectedName),
    join(cloneDir, '.agents', 'skills', expectedName),
    join(cloneDir, '.claude', 'skills', expectedName),
    join(cloneDir, expectedName),
    cloneDir,
  ];

  for (const candidate of commonCandidates) {
    const meta = readSkillMeta(candidate);
    if (meta && meta.name === expectedName) return candidate;
  }

  const matches = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED_ENTRIES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const meta = readSkillMeta(full);
        if (meta && meta.name === expectedName) matches.push(full);
        walk(full);
      }
    }
  }
  walk(cloneDir);

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const rels = matches.map((m) => relative(cloneDir, m)).join(', ');
    throw new Error(
      `Se encontraron múltiples carpetas con name="${expectedName}" (${rels}). Especifica "path" en skills.sources.json.`
    );
  }
  throw new Error(
    `No se encontró ningún SKILL.md con name="${expectedName}" en el repositorio origen.`
  );
}

function collectFiles(dir, baseDir = dir, map = new Map()) {
  if (!existsSync(dir)) return map;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_ENTRIES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, baseDir, map);
    } else if (entry.isFile()) {
      const rel = relative(baseDir, full).replaceAll('\\', '/');
      map.set(rel, full);
    }
  }
  return map;
}

function directoriesDiffer(sourceDir, targetDir) {
  if (!existsSync(targetDir)) return true;
  const srcFiles = collectFiles(sourceDir);
  const dstFiles = collectFiles(targetDir);
  if (srcFiles.size !== dstFiles.size) return true;

  for (const [rel, srcPath] of srcFiles) {
    const dstPath = dstFiles.get(rel);
    if (!dstPath) return true;
    if (statSync(srcPath).size !== statSync(dstPath).size) return true;
    if (!readFileSync(srcPath).equals(readFileSync(dstPath))) return true;
  }
  return false;
}

function syncOne(name, source, { dryRun }) {
  const targetDir = join(SKILLS_DIR, name);
  const prevMeta = readSkillMeta(targetDir);
  const cloneRoot = mkdtempSync(join(tmpdir(), `skill-sync-${name}-`));

  try {
    const cloneUrl = repoToCloneUrl(source.repo);
    const args = ['clone', '--depth', '1'];
    if (source.branch) args.push('--branch', source.branch);
    args.push(cloneUrl, cloneRoot);

    execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const commit = execFileSync('git', ['-C', cloneRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();

    const upstreamName = source.skillName || name;
    const sourceDir = findSkillDir(cloneRoot, upstreamName, source.path);
    const nextMeta = readSkillMeta(sourceDir);

    if (!nextMeta?.name || !nextMeta?.description) {
      throw new Error(`El SKILL.md origen de "${name}" no tiene "name" o "description" válidos`);
    }
    if (nextMeta.name !== name) {
      throw new Error(
        `El name del frontmatter origen ("${nextMeta.name}") no coincide con la carpeta local ("${name}")`
      );
    }

    const changed = directoriesDiffer(sourceDir, targetDir);
    const status = !prevMeta ? 'added' : changed ? 'updated' : 'unchanged';

    if (changed && !dryRun) {
      rmSync(targetDir, { recursive: true, force: true });
      cpSync(sourceDir, targetDir, {
        recursive: true,
        filter: (src) => {
          const base = src.split(/[\\/]/).pop();
          return !IGNORED_ENTRIES.has(base);
        },
      });
    }

    return {
      name,
      repo: source.repo,
      repoUrl: repoToWebUrl(source.repo),
      commit,
      shortCommit: commit.slice(0, 7),
      prevVersion: prevMeta?.version || '-',
      nextVersion: nextMeta.version || '-',
      status,
    };
  } finally {
    rmSync(cloneRoot, { recursive: true, force: true });
  }
}

function buildMarkdownSummary(results) {
  const updated = results.filter((r) => r.status !== 'unchanged');
  const lines = [
    '## Resumen de sincronización de skills',
    '',
    '| Skill | Origen | Versión | Commit | Estado |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const r of results) {
    const versionCell =
      r.prevVersion === r.nextVersion ? r.nextVersion : `${r.prevVersion} → ${r.nextVersion}`;
    const commitLink = `[\`${r.shortCommit}\`](${r.repoUrl}/commit/${r.commit})`;
    const repoLink = `[${r.repo}](${r.repoUrl})`;
    const statusLabel =
      r.status === 'added'
        ? 'Nuevo'
        : r.status === 'updated'
          ? 'Actualizado'
          : 'Sin cambios';
    lines.push(`| \`${r.name}\` | ${repoLink} | ${versionCell} | ${commitLink} | ${statusLabel} |`);
  }

  lines.push('');
  lines.push(
    updated.length > 0
      ? `Skills con cambios: ${updated.map((r) => `\`${r.name}\``).join(', ')}.`
      : 'Todos los skills externos ya están al día.'
  );
  return lines.join('\n') + '\n';
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  if (!existsSync(SOURCES_PATH)) {
    throw new Error(`No se encontró ${SOURCES_PATH}`);
  }

  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'));
  const names = opts.skills.length > 0 ? opts.skills : Object.keys(sources);

  for (const name of names) {
    if (!sources[name]) {
      throw new Error(`"${name}" no está definido en skills.sources.json`);
    }
  }

  const results = [];
  for (const name of names) {
    console.log(`Sincronizando ${name} desde ${sources[name].repo}...`);
    const res = syncOne(name, sources[name], opts);
    results.push(res);
    const verInfo =
      res.prevVersion === res.nextVersion
        ? res.nextVersion
        : `${res.prevVersion} -> ${res.nextVersion}`;
    console.log(
      `  [${res.status}] ${res.name} (${verInfo}) @ ${res.shortCommit}${opts.dryRun ? ' (dry-run)' : ''}`
    );
  }

  const summary = buildMarkdownSummary(results);
  if (opts.summaryFile) {
    writeFileSync(opts.summaryFile, summary, 'utf8');
  }

  const changedCount = results.filter((r) => r.status !== 'unchanged').length;
  console.log(`\nListo: ${changedCount} skill(s) con cambios de ${results.length} revisado(s).`);
}

try {
  main();
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
