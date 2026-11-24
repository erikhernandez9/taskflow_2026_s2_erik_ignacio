# Ejercicio 2 (Clase 12) — De la historia a los tests con IA: US-16

- **Historia:** US-16, fecha de vencimiento de una tarea (8 criterios).
- **Herramienta:** Claude Sonnet 5.5 (`claude-sonnet-5-5`), desde Claude Code, en
  conversaciones nuevas y sin acceso al repo: solo lo que dice cada prompt.
- **Prompts:** `prompt-us16-v1.md` (2a) y `prompt-us16-v2-revision.md` (2b).
- **Tests resultantes:** `server/tests/us16-due-date-ia.test.ts`.
- **Fecha:** 2026-11-24.

Los rojos no se arreglan: se anotan. Cada test se clasificó en una de cinco
categorías: verde y correcto · verde pero no prueba nada · rojo por bug real ·
rojo por test mal escrito · alucinado.

Corrimos todo dos veces, porque el resultado depende de la zona horaria del
servidor (issue #4): con `TZ=UTC`, como el runner de GitHub Actions, y con la
zona de la máquina de desarrollo (America/Montevideo, UTC-3).

## 2a · Primer prompt

La IA devolvió un archivo de 478 líneas con 27 bloques `it`/`it.each`, que se
expanden en **57 casos**. Usó solo los endpoints y helpers del prompt.

| Categoría | Casos | Cuáles |
|---|---|---|
| Verde y correcto | 44 | c1 (2), c2 (3), c3 ida y vuelta por POST y PATCH con 5 fechas borde (10), c4 (4), c5 (3), c6 con 8 formatos inválidos por POST y PATCH (16) + 2 de "no modifica / no crea", c7 (3), c8 control positivo del dueño (1) |
| Verde pero no prueba nada | 6 | Los 6 tests de c3 que cambian `process.env.TZ` dentro del test (5 zonas + "cambiar la zona entre escritura y lectura"). Jest aísla `process.env` por archivo, así que **la zona del servidor nunca cambia**: lo comprobamos con una sonda (`new Date('2026-09-15').getDate()` da 15 antes y después de poner `Pacific/Pago_Pago`). Pasan en UTC aunque la API tenga el bug de zona horaria. |
| Rojo por bug real | 7 | c8: un no-miembro cambia la fecha (200 en vez de 403), la fecha queda cambiada, y puede borrarla con `null` (3 casos, issue #1). c6: `2026-02-30` y `2026-02-29` (2026 no es bisiesto) se aceptan por POST y PATCH y se guardan como 2 y 1 de marzo (4 casos, **bug nuevo, issue #14**). |
| Rojo por test mal escrito | 0 | — |
| Alucinado | 0 | No inventó endpoints ni criterios. |

Con `TZ=UTC` el resultado es **50 verdes y 7 rojos**. En UTC-3 fallan 36: los 7
de arriba y 29 más de c1, c2, c3, c4, c5, c6 y c7. Esos 29 fallan por el bug #4
(la fecha vuelve un día antes), así que son rojos por bug real. Entre ellos están
los 6 tests "de zona horaria": fallan por la zona real de la máquina, no por la
que intentan configurar.

**Cobertura del servidor** (`npm run test:coverage`):

| | Líneas | Ramas | Funciones |
|---|---|---|---|
| Antes (suite sin los tests de IA) | 81,00 % | 55,35 % | 78,26 % |
| Después del 2a | 82,95 % | 58,03 % | 80,43 % |

La suba es chica porque `tasks.service` ya estaba bastante cubierto. Lo nuevo es
la rama de `parseDueDate` y `formatDueDate` con `null`, y la de errores de formato
en PATCH.

## 2b · Segundo prompt, encadenado

A la IA le pasamos su propio archivo y los criterios: "revisá estos tests contra
los criterios y marcá lo que falta". Devolvió 13 hallazgos y 10 bloques `it`
nuevos, que se expanden en **24 casos**.

**Qué hicimos con los hallazgos:**

| Hallazgo de la IA | ¿Correcto? | Qué hicimos |
|---|---|---|
| Los 6 tests que cambian `process.env.TZ` no prueban nada | ✅ Sí (lo confirmamos con la sonda) | Se quitaron de la suite. En su lugar, el job `tests` del pipeline corre con `TZ=America/Montevideo` |
| Las fechas de ida y vuelta solo detectan el bug si el proceso corre fuera de UTC | ✅ Sí | Agregó 4 fechas de cambio de horario. Con el pipeline en UTC-3 ahora sí dan señal |
| Falta enviar fecha con hora (`2026-09-15T23:30:00-03:00`), que rompería "sin hora" | ✅ Sí | Se agregaron 3 casos (esperan 400) |
| Faltan bordes de c6: mes/día `00`, 31 de abril, 1900 y 2100 no bisiestos, tipos no string | ✅ Sí | Se agregaron 11 casos |
| c5: omitir `dueDate` en un PATCH no tiene que borrar la fecha | ✅ Sí | Se agregaron 2 casos |
| c7: faltan "ayer" y "hoy" | ✅ Sí | Se agregaron 2 casos |
| c8: el intruso es un usuario sin proyectos; falta uno que sea dueño de **otro** proyecto, y falta el POST de un no-miembro | ✅ Sí | Se agregaron 2 casos |
| c6 exige `error.code` y `error.message`, "la spec solo dice HTTP 400" | ❌ **No** | Error de razonamiento: la spec sí lo define en "Formato de errores" (código, mensaje y detalle). No lo sabía porque el prompt 1 no incluía esa convención. Los asserts quedan |
| c7 "la tarea se considera vencida" no se puede probar: no hay campo que lo exponga | ✅ Sí, y no inventó un campo | Queda como hueco de trazabilidad: el criterio no es verificable por API |
| c8 positivo con un miembro que no es dueño: falta un helper para agregar miembros | ✅ Sí | Queda pendiente (ver abajo) |

**Clasificación de los 24 casos nuevos** (con `TZ=UTC`):

| Categoría | Casos | Cuáles |
|---|---|---|
| Verde y correcto | 20 | Fechas de cambio de horario (4), fecha con hora (3), c6 mes/día `00`, espacios, barras, año de 5 dígitos, booleano, objeto, arreglo (8), c5 (2), c7 ayer/hoy (2), c8 POST de un no-miembro (1) |
| Verde pero no prueba nada | 0 | — |
| Rojo por bug real | 4 | c6: 31 de abril, `1900-02-29` y `2100-02-29` se aceptan (issue #14). c8: un usuario dueño de otro proyecto cambia la fecha (issue #1) |
| Rojo por test mal escrito | 0 | — |
| Alucinado | 0 | — |

## Comparación 2a vs. 2b: ¿mejoró?

| | 2a | 2a + 2b (final) |
|---|---|---|
| Casos en la suite | 57 | 75 (57 − 6 que no probaban nada + 24) |
| Verdes que no prueban nada | 6 | 0 |
| Rojos por bug real (`TZ=UTC`) | 7 | 11 |
| Rojos en UTC-3 | 36 (6 son de los tests que no prueban nada) | 52 |
| Bugs distintos detectados | 3 (#1, #4 y el nuevo #14) | 3, con más variantes de #14 y de #1 |
| Cobertura de líneas / ramas de toda la suite\* | 82,95 % / 58,03 % | 85,87 % / 67,41 % |

\* La columna final también incluye los tests de caracterización
(`characterization.test.ts`), que se sumaron en paralelo. Solo los tests de IA
del 2a aportaron +1,95 puntos de líneas y +2,68 de ramas.

**Sí, mejoró.** El segundo prompt encontró los 6 tests que no probaban nada sin
que se lo dijéramos explícitamente (solo le avisamos cómo aísla Jest las
variables de entorno) y cubrió bordes reales. Pero también se equivocó en un
punto (el formato del error) por falta de contexto. Lección: **en el prompt hay
que pasar las convenciones generales de la spec, no solo la historia.** Igual que
en el 2a, ningún test vino alucinado. El valor estuvo en encadenar: generar
primero y revisar después.

**No determinismo:** el mismo prompt en otra corrida puede dar casos distintos.
Por eso guardamos los prompts versionados en `docs/ia/` y la suite resultante
en el repo: lo que se evalúa es el archivo, no la conversación.

## Trazabilidad de US-16

| Criterio | Tests (en `us16-due-date-ia.test.ts`) | Resultado `TZ=UTC` | Resultado UTC-3 |
|---|---|---|---|
| c1 · día calendario, sin hora | `c1 · ...` (5) | Verde | Rojo (#4) |
| c2 · formato `YYYY-MM-DD` | `c2 · ...` (3) | Verde | Rojo (#4) |
| c3 · misma fecha en cualquier zona | `c3 · ...` (14) | Verde | Rojo (#4) |
| c4 · opcional | `c4 · ...` (4) | Verde | 3 verdes, 1 rojo (#4) |
| c5 · se quita con `null` | `c5 · ...` (5) | Verde | 2 verdes, 3 rojos (#4) |
| c6 · formato inválido → 400 | `c6 · ...` (33) | 26 verdes, 7 rojos (#14) | 17 verdes, 16 rojos (#4 y #14) |
| c7 · admite fechas pasadas | `c7 · ...` (5) | Verde | Rojo (#4) |
| c7 · "la tarea se considera vencida" | — | **Sin test**: no hay campo ni endpoint que lo exponga | — |
| c8 · solo miembros modifican (403) | `c8 · ...` (6) | 2 verdes, 4 rojos (#1) | 1 verde, 5 rojos (#1 y #4) |
| c8 · un miembro no dueño **sí** puede | — | **Sin test**: falta un helper para agregar miembros | — |
