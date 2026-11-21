# Plantilla de convención

Cada convención va en su propio archivo dentro de `docs/<categoría>/` y tiene estas secciones, en este orden. Una sección que no aplica se omite; no se deja vacía.

````markdown
# <Nombre de la convención>

## Regla

Una o dos frases, en imperativo y verificables. Ej.: "Los tests crean sus datos con Object Mothers; nunca con literales repetidos en cada test."

## Por qué

- Problema concreto que evita.
- Beneficio para el equipo o para los agentes.

## Ejemplos

### ✅ Bien: <qué lo hace correcto>

```ts
// código correcto
```

### ❌ Mal: <qué lo hace incorrecto>

```ts
// código incorrecto
```

## Excepciones

- Cuándo no aplica, y qué hacer en ese caso.

## En el código

- [`ruta/al/archivo.ts`](../../ruta/al/archivo.ts): breve nota de por qué es un buen ejemplo.

## Relacionado

- [Otra convención](../categoría/otra.md)
````

## Reglas de estilo

- **Título**: el nombre de la convención, no una pregunta ni un problema.
- **Regla**: debe poder responderse con sí o no ("¿este código cumple?").
- **Ejemplos**: el ✅ y el ❌ deben resolver el mismo caso, para que la diferencia se vea de un vistazo.
- **Enlaces**: con rutas relativas desde el doc.
- **Sin relleno**: nada de introducciones ni de conclusiones. El lector viene a buscar la regla.

## Ejemplo completo

````markdown
# Fechas en UTC en la base de datos

## Regla

Guarda siempre las fechas en UTC (`timestamptz`) y conviértelas a la zona del usuario solo al mostrarlas.

## Por qué

- Evita errores de una hora con el cambio de horario.
- Los reportes entre países comparan los mismos instantes.

## Ejemplos

### ✅ Bien: se guarda en UTC y se formatea en la vista

```ts
await db.insert(orders).values({ createdAt: new Date() }); // timestamptz
format(order.createdAt, { timeZone: user.timeZone });
```

### ❌ Mal: se guarda en hora local como texto

```ts
await db.insert(orders).values({ createdAt: new Date().toLocaleString('es-PE') });
```

## En el código

- [`src/orders/order-repository.ts`](../../src/orders/order-repository.ts)
````
