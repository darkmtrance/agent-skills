# Publicar el catálogo de skills

## Regla

Mantén los skills desarrollados en `skills/<nombre>/` y publícalos en la web mediante GitHub Pages; no dupliques ni mantenas manualmente el contenido visible del catálogo.

## Por qué

- Centraliza los skills favoritos en un único repositorio y una URL compartible.
- Evita que el catálogo web se separe del contenido instalado por el CLI.
- Permite que compartir el repositorio, copiar comandos y reutilizar los skills sea un flujo único.

## Ejemplos

### ✅ Bien: el skill vive en el directorio fuente y se publica con el despliegue existente

```text
skills/archify/SKILL.md
```

```json
{
  "repo": "darkmtrance/agent-skills",
  "branch": "main"
}
```

Cada cambio confirmado en `main` ejecuta el workflow que genera `site/dist` y despliega el catálogo.

### ❌ Mal: editar solo los archivos generados o mantener una copia distinta del catálogo

```text
site/dist/skills/archify/index.html
```

No agregues un skill solo dentro de `site/dist/` ni mantengas otra copia de su `SKILL.md`; estos archivos son generados y no deben ser la fuente de verdad.

## Excepciones

- Para probar cambios visuales o de generación, puede ejecutarse `npm run dev` o `npm run build` localmente.
- Antes del primer despliegue, GitHub Pages debe configurarse en el repositorio con `GitHub Actions` como fuente.

## En el código

- [`README.md`](../../README.md): describe cómo agregar favoritos y desarrollar el sitio localmente.
- [`skills.config.json`](../../skills.config.json): configura el repositorio, la rama y el texto del catálogo.
- [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml): regenera el sitio y lo publica al cambiar `main`.
- [`site/src/lib/skills.ts`](../../site/src/lib/skills.ts): lee las carpetas de `skills/` y genera los datos del catálogo.

## Relacionado

- [`README.md`](../../README.md)
