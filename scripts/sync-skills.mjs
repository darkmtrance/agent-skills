#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const SOURCES_PATH = join(ROOT, 'skills.sources.json');
const IGNORED_ENTRIES = new Set(['.git', 'node_modules', '.DS_Store']);
const VALID_SKILL_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const EXECUTABLE_EXTS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.sh',
  '.bash',
  '.zsh',
  '.cmd',
  '.bat',
  '.ps1',
  '.py',
  '.rb',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
]);

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

function assertInsideDir(rootDir, candidatePath, label) {
  const rel = relative(resolve(rootDir), resolve(candidatePath));
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Ruta fuera del directorio permitido para ${label}: "${candidatePath}"`);
  }
}

function validateSourceConfig(name, source) {
  if (!VALID_SKILL_NAME.test(name)) {
    throw new Error(`Nombre de skill inválido: "${name}" (solo minúsculas, dígitos y guiones)`);
  }
  if (!source?.repo || typeof source.repo !== 'string') {
    throw new Error(`"${name}" requiere un campo "repo" válido en skills.sources.json`);
  }
  if (source.repo.startsWith('-')) {
    throw new Error(`Valor "repo" inválido para "${name}": no puede empezar con "-"`);
  }
  if (source.branch !== undefined) {
    if (typeof source.branch !== 'string' || !source.branch.trim() || source.branch.startsWith('-')) {
      throw new Error(`Valor "branch" inválido para "${name}"`);
    }
  }
  if (source.path !== undefined) {
    if (typeof source.path !== 'string' || isAbsolute(source.path)) {
      throw new Error(`Valor "path" inválido para "${name}": debe ser relativo`);
    }
  }
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
  if (lstatSync(skillMd).isSymbolicLink()) {
    throw new Error(`Se rechazó un enlace simbólico en ${skillMd}`);
  }
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

function assertNoSymlinks(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_ENTRIES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const lstat = lstatSync(full);
    if (lstat.isSymbolicLink()) {
      throw new Error(
        `El skill origen contiene un enlace simbólico no permitido: "${relative(dir, full)}"`
      );
    }
    if (lstat.isDirectory()) {
      assertNoSymlinks(full);
    }
  }
}

function findSkillDir(cloneDir, expectedName, explicitPath) {
  if (explicitPath) {
    const candidate = resolve(cloneDir, explicitPath);
    assertInsideDir(cloneDir, candidate, `path "${explicitPath}"`);
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
      if (lstatSync(full).isSymbolicLink()) continue;
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
    const lstat = lstatSync(full);
    if (lstat.isSymbolicLink()) {
      throw new Error(`Enlace simbólico no permitido en "${relative(baseDir, full)}"`);
    }
    if (lstat.isDirectory()) {
      collectFiles(full, baseDir, map);
    } else if (lstat.isFile()) {
      const rel = relative(baseDir, full).replaceAll('\\', '/');
      map.set(rel, full);
    }
  }
  return map;
}

function isExecutableFile(relPath, fullPath) {
  const ext = extname(relPath).toLowerCase();
  if (EXECUTABLE_EXTS.has(ext)) return true;
  if (relPath.startsWith('bin/') || relPath.startsWith('scripts/')) {
    const head = readFileSync(fullPath).subarray(0, 2).toString('utf8');
    if (head === '#!') return true;
  }
  return false;
}

function diffDirectories(sourceDir, targetDir) {
  const srcFiles = collectFiles(sourceDir);
  const dstFiles = existsSync(targetDir) ? collectFiles(targetDir) : new Map();
  let changed = !existsSync(targetDir) || srcFiles.size !== dstFiles.size;
  const changedExecutables = [];

  for (const [rel, srcPath] of srcFiles) {
    const dstPath = dstFiles.get(rel);
    const fileChanged =
      !dstPath ||
      statSync(srcPath).size !== statSync(dstPath).size ||
      !readFileSync(srcPath).equals(readFileSync(dstPath));

    if (fileChanged) {
      changed = true;
      if (isExecutableFile(rel, srcPath)) {
        changedExecutables.push(rel);
      }
    }
  }

  return { changed, changedExecutables: changedExecutables.sort() };
}

function syncOne(name, source, { dryRun }) {
  validateSourceConfig(name, source);
  const targetDir = join(SKILLS_DIR, name);
  assertInsideDir(SKILLS_DIR, targetDir, `skill "${name}"`);

  const prevMeta = readSkillMeta(targetDir);
  const cloneRoot = mkdtempSync(join(tmpdir(), `skill-sync-${name}-`));

  try {
    const cloneUrl = repoToCloneUrl(source.repo);
    const args = ['clone', '-c', 'core.symlinks=false', '--depth', '1'];
    if (source.branch) args.push('--branch', source.branch);
    args.push('--', cloneUrl, cloneRoot);

    execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const commit = execFileSync('git', ['-C', cloneRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();

    const upstreamName = source.skillName || name;
    const sourceDir = findSkillDir(cloneRoot, upstreamName, source.path);
    assertInsideDir(cloneRoot, sourceDir, `sourceDir de "${name}"`);
    assertNoSymlinks(sourceDir);

    const nextMeta = readSkillMeta(sourceDir);

    if (!nextMeta?.name || !nextMeta?.description) {
      throw new Error(`El SKILL.md origen de "${name}" no tiene "name" o "description" válidos`);
    }
    if (nextMeta.name !== name) {
      throw new Error(
        `El name del frontmatter origen ("${nextMeta.name}") no coincide con la carpeta local ("${name}")`
      );
    }

    const { changed, changedExecutables } = diffDirectories(sourceDir, targetDir);
    const status = !prevMeta ? 'added' : changed ? 'updated' : 'unchanged';

    if (changed && !dryRun) {
      rmSync(targetDir, { recursive: true, force: true });
      cpSync(sourceDir, targetDir, {
        recursive: true,
        filter: (src) => {
          const base = src.split(/[\\/]/).pop();
          if (IGNORED_ENTRIES.has(base)) return false;
          if (lstatSync(src).isSymbolicLink()) {
            throw new Error(`Enlace simbólico rechazado durante la copia: "${src}"`);
          }
          return true;
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
      changedExecutables,
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

  const execAlerts = updated.filter((r) => r.changedExecutables.length > 0);
  if (execAlerts.length > 0) {
    lines.push('');
    lines.push('### ⚠️ Archivos ejecutables o scripts modificados (revisar antes de hacer merge)');
    lines.push('');
    for (const r of execAlerts) {
      const sample = r.changedExecutables.slice(0, 15).map((f) => `\`${f}\``).join(', ');
      const extra =
        r.changedExecutables.length > 15
          ? ` (+${r.changedExecutables.length - 15} más)`
          : '';
      lines.push(`- **\`${r.name}\`** (${r.changedExecutables.length}): ${sample}${extra}`);
    }
  }

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
