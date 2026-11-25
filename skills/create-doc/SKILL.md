---
name: create-doc
description: "Documenta una convención del equipo como un archivo Markdown independiente en docs/<categoría>/, a partir de la conversación actual: cuando el usuario corrigió tu implementación por una regla no escrita ('aquí no lo hacemos así', 'usa X en vez de Y', 'siempre…', 'nunca…'), o cuando pide 'documenta esto', 'deja esto como convención', 'agrega una regla al AGENTS.md' o 'que no vuelva a pasar'. También sirve sin conversación previa, a partir de una descripción y del código existente. No usar para READMEs, documentación de API, guías para usuarios finales ni para reorganizar documentación ya existente (para eso usa organize-docs)."
license: MIT
user-invocable: true
argument-hint: "[descripción opcional de la convención]"
metadata:
  author: darkmtrance
  version: "1.1.0"
  last_updated: "2026-11-25"
  inspired-by: "CodelyTV/agent-harness create-doc (MIT)"
---

# Documentar una convención del equipo

El objetivo es convertir una corrección puntual en conocimiento permanente: un doc corto, autocontenido y fácil de encontrar, que un agente pueda leer solo, sin cargar el resto de la documentación.

## Cuándo se usa

- **Después de una corrección** (es el caso principal): el usuario arregló algo que hiciste mal por una convención que no estaba escrita. Saca todo el contenido de esa conversación.
- **Sin contexto previo**: el usuario describe la convención (con `$ARGUMENTS` o en el mensaje). Busca en el código ejemplos reales que la sigan y que no la sigan.

## Pasos

### 1. Extraer la convención

De la conversación (o de la descripción y el código), identifica:

| Qué | De dónde sale |
|---|---|
| **Regla** | Qué te corrigieron, formulado como una instrucción clara y verificable |
| **Por qué** | El motivo que dio el usuario o el problema que evita. Si no hay motivo, pregunta: no lo inventes |
| **Ejemplo ✅** | La versión corregida por el usuario |
| **Ejemplo ❌** | Tu versión original |
| **Casos reales** | Archivos del repo que ya siguen la regla (búscalos con grep o glob) |
| **Excepciones** | Situaciones en las que la regla no aplica, si se mencionaron |
| **Relacionados** | Docs existentes en `docs/` que tocan el mismo tema |

### 2. Elegir la ubicación

- Lista `docs/` para ver las categorías que ya existen (`backend/`, `frontend/`, `testing/`, `database/`…) y usa la que encaje.
- Si ninguna encaja, crea una carpeta nueva con un nombre corto en kebab-case.
- Nombre del archivo: `docs/<categoría>/<nombre-de-la-convención>.md`, en kebab-case y describiendo la regla, no el problema (`object-mothers.md`, no `tests-feos.md`).
- **Antes de crear el archivo, revisa si ya existe un doc sobre el tema.** Si existe, amplíalo en lugar de duplicarlo.

### 3. Preguntar solo si hace falta

Pregunta (con AskUserQuestion si está disponible) **solo** si:
- la regla admite más de una interpretación,
- en el código hay patrones contradictorios y no está claro cuál es el bueno,
- no hay un motivo claro para la regla,
- se mencionaron excepciones sin explicarlas.

Si la conversación ya lo deja claro, escribe el doc directamente.

### 4. Escribir el doc

Sigue la plantilla y las reglas de [`references/plantilla.md`](references/plantilla.md). Escribe en el mismo idioma que los docs existentes. Si todavía no hay docs, usa el idioma del usuario.

### 5. Registrar el doc en el índice

- Agrega una línea al índice de docs en `AGENTS.md` (o `CLAUDE.md`, el que use el proyecto): `- [Título](docs/categoría/archivo.md): una frase sobre cuándo aplica`.
- Si no hay índice, crea una sección `## Docs` al final de `AGENTS.md`.
- Si el repo ya tiene `.github/copilot-instructions.md` con sección `## Docs`, sincroniza también esa línea (usando ruta `../docs/categoría/archivo.md`).

### 6. Cerrar

Responde con:
- la ruta del doc creado o actualizado,
- la regla en una línea,
- si la regla se puede comprobar automáticamente (lint, test, regla de formateo), una sugerencia para hacerlo, porque una regla automática es más confiable que un doc.

## Recordatorios

- Un doc = una convención. Si salen dos, crea dos docs.
- Los ejemplos tienen que ser código real del proyecto o derivados de él, no genéricos.
- Breve: si pasa de ~80 líneas, probablemente son dos convenciones.
- Mantén el tono de los docs existentes.
