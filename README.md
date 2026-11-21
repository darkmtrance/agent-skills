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
2. Conserva el LICENSE y la autoría originales.
3. Haz commit y push a `main`. GitHub Actions regenera y publica el sitio.

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
| impeccable | ver SKILL.md | Apache 2.0 |
| create-doc | propio (inspirado en CodelyTV/agent-harness, MIT) | MIT |
| organize-docs | propio | MIT |
