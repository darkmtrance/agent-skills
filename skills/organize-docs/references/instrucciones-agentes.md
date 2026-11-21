# Archivos de instrucciones de agentes

Algunos archivos los lee el agente automáticamente desde una ruta fija. **No se mueven ni se dividen hacia `docs/`.** Se validan y se mantienen sincronizados con el índice.

| Archivo | Agente | Ruta obligatoria |
|---|---|---|
| `AGENTS.md` | Codex, Copilot coding agent, Cursor y otros | raíz (o subcarpetas, con alcance local) |
| `CLAUDE.md` | Claude Code | raíz, subcarpetas o `.claude/CLAUDE.md` |
| `copilot-instructions.md` | GitHub Copilot | `.github/copilot-instructions.md` |
| `*.instructions.md` | GitHub Copilot (por ruta de archivo) | `.github/instructions/` |
| `*.prompt.md` | GitHub Copilot (prompts reutilizables) | `.github/prompts/` (fuera de alcance: son prompts, no docs) |

## Fuente única de verdad

- Las convenciones viven en `docs/<categoría>/`.
- `AGENTS.md` y `.github/copilot-instructions.md` tienen **la misma sección `## Docs`** (formato en [`indice.md`](indice.md)) más lo específico de cada agente. Las rutas de los enlaces cambian según dónde está el archivo:
  - desde `AGENTS.md`: `docs/testing/object-mothers.md`
  - desde `.github/copilot-instructions.md`: `../docs/testing/object-mothers.md`
- `CLAUDE.md` puede tener solo `@AGENTS.md`, que importa ese archivo, para no duplicar el índice.
- Una regla escrita directamente en uno de estos archivos se mueve a `docs/` y en su lugar queda el enlace. La excepción son las instrucciones propias del agente, por ejemplo "responde en español" o "usa el MCP X".

## Validaciones de Copilot

### `.github/copilot-instructions.md`

1. **Ruta y nombre exactos.** Busca variantes mal ubicadas o mal escritas: `copilot-instruction.md` en singular, `copilot-instructions.md` en la raíz, `.github/copilot/instructions.md`, `.copilot-instructions.md`. Si encuentras una, proponla como `renombrar` o `mover` a `.github/copilot-instructions.md`. Si ya existe la correcta, proponla como `fusionar`.
2. **Enlaces.** Los enlaces son relativos a `.github/`. Revisa que cada enlace apunte a un archivo que exista.
3. **Índice sincronizado.** La sección `## Docs` lista los mismos docs que la de `AGENTS.md`. Reporta los que falten o sobren en cada lado.
4. **Sin contradicciones** con `AGENTS.md`, `CLAUDE.md` ni `docs/`. Las que encuentres se le preguntan al usuario, como el resto.
5. **Tamaño.** Copilot lo carga en cada pedido. Si pasa de ~200 líneas o copia convenciones completas, propón moverlas a `docs/` y dejar solo el enlace.

### `.github/instructions/*.instructions.md`

1. **Frontmatter.** Cada archivo tiene `applyTo` con uno o varios globs entre comillas, separados por comas, por ejemplo `applyTo: "src/**/*.ts,tests/**/*.ts"`.
2. **Los globs encuentran archivos.** Lista los archivos del repo que coinciden con cada glob. Un glob que no coincide con ningún archivo está roto o es obsoleto: repórtalo.
3. **Nombre del archivo.** Debe terminar en `.instructions.md`. Uno que termine solo en `.md` dentro de `instructions/` Copilot no lo lee.
4. **Solapamiento.** Si dos archivos tienen globs que coinciden y dan instrucciones distintas, es una contradicción.
5. **Duplicados con `docs/`.** Si un `.instructions.md` copia una convención de `docs/`, propón dejar en él el enlace (`../../docs/...`) y una línea de resumen. Mantener el archivo es necesario, porque es lo que hace que Copilot aplique la regla a esas rutas.

## En la tabla de acciones

Estos archivos aparecen con acciones de un tipo propio: `validar`, `sincronizar índice`, `renombrar` (ruta incorrecta), `extraer a docs` (para reglas incrustadas) o `corregir applyTo`. Nunca `dividir` ni `mover` fuera de su ruta obligatoria.
