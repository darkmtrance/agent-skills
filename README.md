# Mis skills favoritos

Repositorio y catálogo web de los skills para agentes de IA que uso. Cada skill vive en `skills/<nombre>/SKILL.md`, y el sitio en `site/` se genera a partir de esas carpetas.

## Instalar

Con el CLI [`skills`](https://www.npmjs.com/package/skills) (Node 18+):

```bash
# ver qué hay
npx skills add darkmtrance/agent-skills --list

# un skill
npx skills add darkmtrance/agent-skills --skill archify

# global para Claude Code
npx skills add darkmtrance/agent-skills --skill archify -g -a claude-code

# global para GitHub Copilot
npx skills add darkmtrance/agent-skills --skill archify -g -a github-copilot

# todos
npx skills add darkmtrance/agent-skills
```

## Agregar un favorito

1. Copia la carpeta del skill a `skills/<nombre>/`. El `name` del frontmatter del `SKILL.md` tiene que coincidir con el nombre de la carpeta.
2. Si proviene de un repositorio externo, regístralo en `skills.sources.json` (con `repo`, opcionalmente `branch` y `path`) para que se sincronice automáticamente.
3. Conserva el LICENSE y la autoría originales.
4. Haz commit y push a `main`. GitHub Actions regenera y publica el sitio.

## Sincronizar skills externos

Los skills declarados en `skills.sources.json` se actualizan mediante `scripts/sync-skills.mjs`:

```bash
# comprobar si hay cambios sin escribir archivos
node scripts/sync-skills.mjs --dry-run

# sincronizar todos los skills externos
node scripts/sync-skills.mjs

# sincronizar uno específico
node scripts/sync-skills.mjs archify
```

En GitHub, el workflow [`.github/workflows/sync-skills.yml`](.github/workflows/sync-skills.yml) ejecuta esta sincronización todos los lunes (y bajo demanda con `workflow_dispatch`), verifica que el sitio compile y abre un Pull Request si detecta cambios. Para que pueda crear PRs, habilita en GitHub **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**.

## Desarrollo local

```bash
cd site
npm install
npm run dev      # http://localhost:4321/agent-skills/
npm run build
```

## Configuración

En `skills.config.json` están el repo (`usuario/repo`), la rama, el título y el texto de presentación. De ahí salen los comandos de instalación y la URL de GitHub Pages (`https://<usuario>.github.io/<repo>/`).

Para el primer deploy, en GitHub ve a **Settings → Pages → Source: GitHub Actions**.

## Créditos

| Skill | Autor / origen | Licencia |
|---|---|---|
| archify | tt-a1i | Apache-2.0 (ver `skills/archify/LICENSE`, `NOTICE`) |
| impeccable | pbakaus | Apache 2.0 |
| security-audit | Cloudflare | ver repo origen (`cloudflare/security-audit-skill`) |
| create-doc | propio (inspirado en CodelyTV/agent-harness, MIT) | MIT |
| organize-docs | propio | MIT |
