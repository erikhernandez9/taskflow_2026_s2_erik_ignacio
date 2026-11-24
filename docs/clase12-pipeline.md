# Clase 12 · Ejercicio 1 — El pipeline en nuestro repo

## 1A · El pipeline corriendo

- **Workflow:** `.github/workflows/ci.yml` ("CI de calidad (informativo)"), el
  `ci.yml` del curso más un job de E2E (Ejercicio 1C).
- **Rama y PR:** `agregar-ci` →
  [PR #13](https://github.com/erikhernandez9/taskflow_2026_s2_erik_ignacio/pull/13).
- **Corridas:** dos por el mismo commit (`1560488`): una por el push
  ([run 45473729238](https://github.com/erikhernandez9/taskflow_2026_s2_erik_ignacio/actions/runs/45473729238))
  y otra al abrir el PR
  ([run 45473769858](https://github.com/erikhernandez9/taskflow_2026_s2_erik_ignacio/actions/runs/45473769858)).
  Dieron el mismo resultado.
- **Duración total:** 2 min 9 s (el job más lento es el E2E, con 2 min 3 s).
- **Artefactos de cada corrida:** `cobertura` (lcov), `playwright-report` y
  `playwright-traces` (capturas, videos y traces de los fallos).

![Pestaña Actions con el resultado del run del PR](evidencia/actions-run-pr.png)

| Job | Resultado | Duración |
|---|---|---|
| Build del servidor | ✅ Verde | 25 s |
| Lint (ESLint) | ❌ Rojo | 22 s |
| Tests (unit e integración) | ❌ Rojo | 1 min 0 s |
| Cobertura con umbral (líneas 80 / ramas 40) | ❌ Rojo | 1 min 0 s |
| Build del cliente | ✅ Verde | 26 s |
| E2E (Playwright) | ❌ Rojo | 2 min 3 s |

Los jobs no tienen `needs`, así que un rojo no tapa a los demás. El pipeline
informa y no bloquea: no hay branch protection.

## 1B · Lectura de cada etapa en rojo

Categorías de la clase: **a.** bug real · **b.** falta de tests · **c.** calidad
de código · **d.** pipeline o entorno. No se arregla nada, y un test rojo contra
la spec no se borra.

| Etapa en rojo | Categoría | Línea del log o anotación que lo demuestra |
|---|---|---|
| Lint (ESLint) | **c.** Calidad de código | `comments.service.ts#L7` `Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any` · `#L16` `'e' is defined but never used  @typescript-eslint/no-unused-vars` · `#L26` `Unexpected any` → `✖ 3 problems (3 errors, 0 warnings)` |
| Tests (unit e integración) | **a.** Bug real | `Tests: 66 failed, 130 passed, 196 total`. Ejemplo: `● US-16 · ... › c1 · al crear con dueDate "2026-09-15" responde 201 ...` → `Expected: "2026-09-15"  Received: "2026-09-14"` (issue #4). Cada test rojo apunta a un issue: #1, #2, #3, #4, #5, #6, #7, #8, #9, #12 y #14 |
| Cobertura con umbral | **a.** Bug real (no **b.**) | `All files | 83.47 | 67.41 | 84.78 | 85.87`: **el umbral se cumple** (85,87 % de líneas ≥ 80 y 67,41 % de ramas ≥ 40). El job queda rojo porque corre la misma suite: `Tests: 24 failed, 172 passed, 196 total` |
| E2E (Playwright) | **a.** Bug real | `2 failed  68 passed (49.6s)`: `US-15 c1 · la etiqueta se guarda en minusculas y sin espacios` (issue #10) y `US-15 c3 · repetir una etiqueta no genera un duplicado` (issue #11). Fallan igual en los 2 reintentos, así que no son flaky |

Qué no es rojo, y por qué vale la pena anotarlo:

- **Ningún rojo es de categoría d. (pipeline o entorno).** Las 6 anotaciones
  restantes son avisos (`Node.js 20 is deprecated`), por `actions/checkout@v4` y
  `actions/setup-node@v4`. La clase dice que se pueden ignorar.
- **Hay una diferencia de entorno que decidimos fijar.** Los tests dan 66 rojos en
  el job `tests` y 24 en el de `cobertura`, con la misma suite. La diferencia es
  la zona horaria. El job `tests` corre con `TZ=America/Montevideo` (la de
  nuestras máquinas), y ahí aparece el bug #4 (la fecha de vencimiento vuelve un
  día antes). El de `cobertura` corre en la zona del runner (UTC), donde ese bug
  no se ve. Sin fijar `TZ`, el mismo commit daba resultados distintos en la
  máquina de cada uno y en CI.
- **No hay rojos por falta de tests (b.).** La cobertura pasó de 81 % a 85,87 % de
  líneas con los tests de caracterización y los de IA, y supera el gate de 80 %
  del Proyecto Integrador.
