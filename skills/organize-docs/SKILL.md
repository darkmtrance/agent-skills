---
name: organize-docs
description: "Ordena la documentación Markdown que ya existe en un repo: hace inventario de los .md (docs/, raíz, AGENTS.md, CLAUDE.md, .github/copilot-instructions.md, .github/instructions/*.instructions.md, READMEs internos), detecta convenciones duplicadas, contradictorias o mezcladas en documentos monolíticos, valida las instrucciones de Copilot (ruta y nombre, globs de applyTo, enlaces, índice sincronizado con AGENTS.md), propone una estructura docs/<categoría>/ con un doc por convención y, cuando el usuario aprueba, mueve con git mv, divide, fusiona, corrige los enlaces y regenera el índice de AGENTS.md y de copilot-instructions.md. Úsalo cuando pidan 'ordena los docs', 'organiza la documentación', 'limpia el AGENTS.md', 'revisa el copilot-instructions', 'reestructura docs/', 'tengo muchos markdown desordenados' o 'unifica las convenciones'. Para documentar UNA convención nueva usa create-doc."
license: MIT
user-invocable: true
argument-hint: "[carpeta o archivos a ordenar, por defecto todo el repo]"
metadata:
  author: darkmtrance
  version: "1.2.0"
  last_updated: "2026-11-24"
---

# Ordenar la documentación existente

El objetivo es que la documentación quede con la misma forma que deja `create-doc`: un doc por convención en `docs/<categoría>/`, con la plantilla común y un `AGENTS.md` que sirva de índice corto. **No se pierde contenido, no se rompen enlaces y no se toca nada hasta que el usuario aprueba el plan.**

## Reglas de seguridad

- **Antes de cambiar nada, comprueba el estado de git** (`git status`). Si hay cambios sin commitear en los `.md` que vas a tocar, pídele al usuario que los commitee o los guarde con stash. Si el proyecto no es un repo git, avísale y pídele confirmación explícita antes de seguir.
- Mueve los archivos con `git mv`, no copiando y borrando, para conservar el historial.
- **No inventes reglas ni ejemplos.** Al dividir o fusionar, reorganiza el texto que ya existe; solo puedes reescribirlo para que encaje en la plantilla.
- **Las contradicciones las decide el usuario.** Nunca elijas tú entre dos versiones de una regla.
- **Los archivos de instrucciones de agentes no se mueven fuera de su ruta obligatoria** (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`): se validan y se sincronizan según [`references/instrucciones-agentes.md`](references/instrucciones-agentes.md).
- **No toques los docs para usuarios finales** (README público, CHANGELOG, LICENSE, docs de API generadas, ADRs con fecha). Lístalos como "fuera de alcance".

## Pasos

### 1. Inventario

1. Busca todos los `.md` y `.mdx` (excluye `node_modules/`, `dist/`, `.git/` y las carpetas de skills como `.claude/skills/` o `.agents/skills/`). **Incluye `.github/`**: `copilot-instructions.md` e `instructions/*.instructions.md` viven ahí. Busca también las variantes mal ubicadas o mal escritas (`copilot-instruction.md`, `copilot-instructions.md` en la raíz).
2. Por cada archivo anota: ruta, título, tamaño en líneas, temas que trata y enlaces entrantes y salientes. Para los entrantes, haz grep de su nombre en todo el repo, código incluido.
3. Clasifica cada archivo:
   - **Convención única**: ya trata un solo tema.
   - **Monolítico**: mezcla varios temas y hay que dividirlo.
   - **Duplicado**: el mismo tema aparece en otro archivo.
   - **Contradicción**: dos archivos dicen cosas incompatibles.
   - **Obsoleto**: nombra archivos, librerías o comandos que ya no existen en el repo (verifícalo).
   - **Instrucciones de agente**: `AGENTS.md`, `CLAUDE.md` y los archivos de Copilot. Corre sobre ellos las validaciones de [`references/instrucciones-agentes.md`](references/instrucciones-agentes.md) y anota cada problema (ruta incorrecta, `applyTo` que no coincide con ningún archivo, enlace roto, índice desincronizado, regla incrustada).
   - **Fuera de alcance**: ver las reglas de seguridad.

Si hay más de ~40 archivos, delega el inventario por carpetas a subagentes, si los tienes disponibles.

### 2. Propuesta (sin tocar nada)

Muestra al usuario un plan con lo siguiente:

1. **Estructura final** de `docs/` como árbol de carpetas. Reutiliza las categorías que ya existen y crea pocas nuevas, en kebab-case.
2. **Tabla de acciones**, una fila por archivo de origen:

   | Origen | Acción | Destino | Nota |
   |---|---|---|---|
   | `GUIDELINES.md` | dividir | `docs/testing/object-mothers.md`, `docs/backend/errores.md` | 3 temas |
   | `docs/tests.md` | fusionar | `docs/testing/object-mothers.md` | duplica la sección "mothers" |
   | `docs/api/naming.md` | dejar | — | ya cumple la plantilla |
   | `copilot-instruction.md` | renombrar | `.github/copilot-instructions.md` | ruta y nombre incorrectos: Copilot no lo lee |
   | `.github/instructions/react.instructions.md` | corregir applyTo | — | `src/**/*.jsx` no coincide con ningún archivo; el repo usa `.tsx` |

   Las acciones posibles son: `dejar`, `mover`, `renombrar`, `dividir`, `fusionar`, `adaptar a plantilla`, `marcar obsoleto`, `fuera de alcance`. Para los archivos de instrucciones de agente: `validar`, `sincronizar índice`, `extraer a docs`, `corregir applyTo`.
3. **Contradicciones**: pregúntalas con AskUserQuestion, si está disponible, mostrando las dos versiones y su origen.
4. **Obsoletos**: pregunta si se borran o se conservan con una nota.
5. **Borrador del índice nuevo** de `AGENTS.md` y de `.github/copilot-instructions.md`, con las rutas relativas de cada uno. Si el repo no tiene `copilot-instructions.md`, pregunta si el equipo usa Copilot antes de proponer crearlo.

Espera la aprobación. El usuario puede aprobar todo o solo algunas filas.

### 3. Aplicar

Sigue este orden, para que los enlaces se puedan rastrear:

1. `git mv` de los archivos que se mueven o se renombran.
2. Dividir los monolíticos: crea un archivo por tema con la plantilla de [`references/plantilla.md`](references/plantilla.md). El archivo original se borra solo si todo su contenido quedó repartido.
3. Fusionar los duplicados en el destino. Cuando dos ejemplos digan lo mismo, conserva el más completo.
4. Adaptar a la plantilla los que lo necesiten, sin cambiar lo que dicen.
5. **Corregir los enlaces**: con el mapa `ruta vieja → ruta nueva`, actualiza todos los enlaces relativos de los `.md` y las referencias en el código (comentarios, configs). Si un enlace apuntaba a una sección de un archivo dividido, haz que apunte al archivo nuevo.
6. Reescribir el índice de `AGENTS.md` (o `CLAUDE.md`) según [`references/indice.md`](references/indice.md). Lo que no sea índice de docs se queda donde está.
7. Copilot:
   - Sincroniza la sección `## Docs` de `.github/copilot-instructions.md` con la de `AGENTS.md`, con enlaces `../docs/...`.
   - Corrige los `applyTo` aprobados.
   - En los `.instructions.md` que copiaban una convención, reemplaza la copia por un enlace (`../../docs/...`) y una línea de resumen.

### 4. Verificar

- **Enlaces rotos**: para cada enlace relativo de los `.md` tocados, comprueba que el archivo de destino exista. Si queda alguno roto, corrígelo antes de cerrar.
- **Cobertura**: cada sección de cada archivo de origen aparece en algún destino o fue descartada con la aprobación del usuario.
- **Índice**: cada archivo de `docs/` aparece una sola vez en el índice, y el índice no apunta a archivos que no existen.
- **Copilot**:
  - `.github/copilot-instructions.md` existe en esa ruta exacta, si el equipo usa Copilot.
  - Su índice lista los mismos docs que el de `AGENTS.md`.
  - Cada `applyTo` coincide con al menos un archivo del repo.
  - Todos los `.instructions.md` tienen ese sufijo.

### 5. Cerrar

Resume para el usuario:
- cuántos archivos movidos, divididos, fusionados y borrados;
- las contradicciones resueltas y cómo;
- lo que quedó fuera de alcance o pendiente;
- un mensaje de commit sugerido (`docs: reorganiza la documentación en docs/<categoría>`). **No hagas el commit salvo que el usuario lo pida.**
