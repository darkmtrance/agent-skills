# Instructivo: skill `organize-docs`

`organize-docs` es un skill para agentes de IA (Claude Code o GitHub Copilot) que **ordena la documentación Markdown que ya existe en un repo**:

- Hace un inventario de todos los `.md`: `docs/`, la raíz, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` y los READMEs internos.
- Detecta convenciones duplicadas, contradictorias o mezcladas en un mismo archivo.
- Propone una estructura `docs/<categoría>/` con un archivo por convención.
- Cuando tú apruebas, mueve, divide y fusiona los archivos, corrige los enlaces y regenera el índice de `AGENTS.md` y de `copilot-instructions.md`.

**No cambia nada hasta que apruebes el plan.**

---

## Contenido del zip

```
organize-docs.zip
├── INSTRUCTIVO.md          ← este archivo
└── organize-docs/          ← el skill (esta es la carpeta que se instala)
    ├── SKILL.md
    └── references/
        ├── indice.md
        ├── instrucciones-agentes.md
        └── plantilla.md
```

---

## 1. Instalación

Descomprime el zip y copia **la carpeta `organize-docs/`** (no el zip ni este instructivo) en la carpeta de skills de tu agente.

### Claude Code

| Alcance | Dónde copiarla |
|---|---|
| Solo un proyecto | `<tu-repo>/.claude/skills/organize-docs/` |
| Todos tus proyectos | `~/.claude/skills/organize-docs/` (en Windows: `C:\Users\<usuario>\.claude\skills\organize-docs\`) |

### GitHub Copilot (VS Code, modo agente)

| Alcance | Dónde copiarla |
|---|---|
| Solo un proyecto | `<tu-repo>/.github/skills/organize-docs/` |
| Todos tus proyectos | `~/.copilot/skills/organize-docs/` |

Para comprobar que quedó bien, la ruta final tiene que ser `.../skills/organize-docs/SKILL.md`, sin una carpeta `organize-docs` metida dentro de otra.

Después de copiarla, reinicia la sesión del agente (cierra y vuelve a abrir Claude Code, o abre un chat nuevo en Copilot).

---

## 2. Antes de usarlo

1. **El proyecto debe ser un repo git.** El skill mueve los archivos con `git mv` para no perder el historial. Si el proyecto no es un repo git, te pedirá confirmación antes de seguir.
2. **Haz commit (o stash) de tus cambios pendientes en los `.md`.** Si hay cambios sin guardar en los archivos que va a tocar, el skill se detiene y te lo pide.
3. Trabaja en una rama aparte (recomendado):
   ```bash
   git checkout -b docs/reorganizacion
   ```

---

## 3. Cómo usarlo

Abre el agente en la raíz del repo y pídeselo de alguna de estas formas:

```
/organize-docs                  # revisa todo el repo
/organize-docs docs/backend     # solo una carpeta
/organize-docs GUIDELINES.md    # solo ciertos archivos
```

También puedes pedírselo en lenguaje natural:

- "Ordena los docs del repo"
- "Limpia el AGENTS.md"
- "Revisa el copilot-instructions"
- "Tengo muchos markdown desordenados, unifica las convenciones"

---

## 4. Qué va a pasar (paso a paso)

### Paso 1: Inventario
El agente lista todos los `.md` y clasifica cada uno así:

| Clase | Significa |
|---|---|
| Convención única | Ya trata un solo tema |
| Monolítico | Mezcla varios temas y hay que dividirlo |
| Duplicado | El mismo tema aparece en otro archivo |
| Contradicción | Dos archivos dicen cosas incompatibles |
| Obsoleto | Menciona archivos, librerías o comandos que ya no existen |
| Instrucciones de agente | `AGENTS.md`, `CLAUDE.md` y los archivos de Copilot: se validan, no se mueven |
| Fuera de alcance | README público, CHANGELOG, LICENSE, ADRs, documentación de API generada |

### Paso 2: Propuesta (todavía no cambia nada)
Te muestra:
- **El árbol final** de `docs/`.
- **Una tabla de acciones**, con una fila por archivo, por ejemplo:

  | Origen | Acción | Destino | Nota |
  |---|---|---|---|
  | `GUIDELINES.md` | dividir | `docs/testing/object-mothers.md`, `docs/backend/errores.md` | 3 temas |
  | `copilot-instruction.md` | renombrar | `.github/copilot-instructions.md` | Copilot no lo lee con ese nombre |

- **Preguntas sobre las contradicciones**: te muestra las dos versiones y tú eliges cuál vale. El agente nunca decide por ti.
- **Preguntas sobre los obsoletos**: si se borran o se conservan con una nota.
- **Un borrador del nuevo índice** de `AGENTS.md` y de `copilot-instructions.md`.

### Paso 3: Tu aprobación
Puedes responder, por ejemplo:
- "Aprobado todo"
- "Aplica todo menos la fila de GUIDELINES.md"
- "Cambia el destino de X a `docs/api/`"

### Paso 4: Aplicar y verificar
El agente mueve, divide y fusiona los archivos, corrige todos los enlaces (incluidas las referencias en el código) y regenera los índices. Al final comprueba que:
- no quede ningún enlace roto;
- todo el contenido original esté en algún archivo nuevo;
- cada doc aparezca una sola vez en el índice;
- los `applyTo` de Copilot coincidan con archivos reales del repo.

### Paso 5: Cierre
Te da un resumen (archivos movidos, divididos, fusionados y borrados, y cómo se resolvió cada contradicción) y **un mensaje de commit sugerido**. No hace el commit salvo que se lo pidas.

---

## 5. Revisar y confirmar el resultado

```bash
git status           # qué archivos cambiaron
git diff --stat      # resumen de cambios
git diff             # detalle
```

Si te gusta el resultado:
```bash
git add -A
git commit -m "docs: reorganiza la documentación en docs/<categoría>"
```

Si no te gusta, puedes deshacerlo todo (**atención: esto borra todos los cambios sin commitear**):
```bash
git reset --hard && git clean -fd
```

---

## 6. Qué NO hace

- **No inventa reglas ni ejemplos.** Solo reorganiza el texto que ya existe.
- **No mueve** `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` ni `.github/instructions/*.instructions.md` fuera de su ruta. Solo los valida y actualiza su índice.
- **No toca** el README público, el CHANGELOG, el LICENSE, los ADRs con fecha ni la documentación de API generada.
- **No hace commit** por su cuenta.
- **No sirve para documentar una convención nueva.** Para eso existe el skill `create-doc`. `organize-docs` funciona sin él, porque trae su propia copia de la plantilla.

---

## 7. Formato que deja en cada doc

Cada convención queda en `docs/<categoría>/<nombre>.md` con estas secciones (las que no aplican se omiten):

```markdown
# <Nombre de la convención>
## Regla          ← 1-2 frases en imperativo, verificables
## Por qué
## Ejemplos       ← ✅ Bien / ❌ Mal sobre el mismo caso
## Excepciones
## En el código   ← enlaces a archivos reales del repo
## Relacionado
```

El índice de `AGENTS.md` queda así: una línea por doc, que dice **cuándo** leerlo.

```markdown
## Docs
### Testing
- [Object Mothers](docs/testing/object-mothers.md): cómo crear datos de prueba.
```

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `/organize-docs` no aparece | Revisa que la ruta sea `.../skills/organize-docs/SKILL.md` y reinicia el agente |
| "Hay cambios sin commitear" | Haz `git commit` o `git stash` de tus `.md` y vuelve a pedírselo |
| El repo tiene muchísimos `.md` | Limita el alcance: `/organize-docs docs/backend` |
| No quieres aplicar una fila del plan | Díselo al aprobar: "todo menos la fila X" |

Licencia: MIT.
