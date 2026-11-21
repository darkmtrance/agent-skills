# Formato del índice de docs en AGENTS.md

El índice le sirve al agente para decidir **qué doc leer** sin tener que abrirlos todos. Va en una sección `## Docs` de `AGENTS.md` (o `CLAUDE.md`), agrupado por categoría y en el mismo orden que las carpetas de `docs/`.

```markdown
## Docs

Lee el doc correspondiente antes de tocar código de esa área.

### Backend
- [Arquitectura hexagonal](docs/backend/hexagonal-architecture.md): cómo se separan dominio, aplicación e infraestructura.
- [Manejo de errores](docs/backend/errores.md): cuándo lanzar errores de dominio y cómo mapearlos a HTTP.

### Testing
- [Object Mothers](docs/testing/object-mothers.md): cómo crear datos de prueba.
```

## Reglas

- Una línea por doc: `- [Título del doc](ruta): cuándo aplica`, en una frase de máximo ~15 palabras.
- La frase dice **cuándo** leer el doc, no repite su contenido.
- Las categorías se titulan con el nombre de la carpeta en formato legible (`database/` se convierte en "Database").
- Las convenciones no se copian dentro de `AGENTS.md`: si había reglas escritas directamente ahí, se mueven a `docs/` y se dejan enlazadas.
- Lo que no es documentación (comandos de build, setup, notas sobre el agente) se queda en `AGENTS.md`, en su propia sección, fuera de `## Docs`.
