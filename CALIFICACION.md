# Equipo 13 — Calificaciones por equipo, Testing y Calidad de Software 2026

**Repo:** https://github.com/erikhernandez9/taskflow_2026_s2_erik_ignacio

Integrantes (del `git log`): Erik (usuario de GitHub erikhernandez9; el apellido Hernández sale del ADR, es una deducción a confirmar con la lista de inscriptos) e Ignacio (usuario BlueNacho, `ignacio.tachini@correo.ucu.edu.uy`; el apellido Tachini sale del email y del ADR, a confirmar con la lista de inscriptos).

Este archivo tiene solo las tareas calificadas por equipo. Las notas individuales (cuestionario de la clase 1, cuestionarios de Moodle y participación) se llevan aparte.

_Escala de las notas: 0-100._

## Tareas por equipo

| Tarea | Clase | Peso | Puntos del curso (máx., de 100) | Nota | Aporta a la final (puntos) | Observaciones |
|---|---|---|---|---|---|---|
| Taller de refinamiento | 2 | 5,3 | 2,65 | pendiente |  | Pendiente de entrega: no figura en el repo (se buscó INVEST, Gherkin y épica en todos los `.md` y `.feature`; única rama `main`). |
| Integration + cobertura + refactor (código pestilente + Ej. 1 de clase 7) | 3 y 7 | 10,6 | 5,30 | 90 | 4,77 | Refactor de 5 smells que preserva el comportamiento y cobertura de 55,35 % de ramas y 81 % de líneas con umbral de 40 % en Jest (verificado). Falta el listado de smells (solo está en el mensaje del commit) y los tests de caracterización previos. |
| Postman + Supertest, caza de bugs | 5 | 5,3 | 2,65 | 95 | 2,52 | Suite Supertest de 81 tests (68 pasan, 13 fallan contra la spec) con status, cuerpo y casos negativos. En `BUG_REPORT.md` y el xlsx faltan entorno y reproducibilidad (los issues #1 a #5 sí los tienen). Postman no se cuenta. |
| ADR | 6 | 5,3 | 2,65 | 100 | 2,65 | ADR 0001 completo (contexto, decisión, consecuencias y alternativas descartadas) y framework Playwright con 5 Component Objects, Page Objects, fixtures y API de datos. |
| E2E + bugs | 7 y 8 | 10,6 | 5,30 | 100 | 5,30 | 68 de 70 E2E pasan (los 2 rojos son bugs de etiquetas contra la spec); US-12, US-14, US-15 y US-16 tienen 5, 6, 5 y 6 casos. 12 GitHub issues con el formato completo. |
| Performance (k6: tabla seed chica vs grande + issue) | 9 | 5,3 | 2,65 | 100 | 2,65 | Tabla seed chica vs. grande, hipótesis e issue #12 completos, con el criterio de la spec citado. Declarado, no verificado: no se corrió k6. |
| Seguridad + accesibilidad (ZAP, axe-core, CVSS) | 11 | 5,3 | 2,65 | 95 | 2,52 | Reportes de ZAP, axe-core con fix verificado y user stories de remediación. Los puntajes CVSS no coinciden con sus vectores y a varios hallazgos les falta el vector. |
| Pipeline (`ci.yml` y job de E2E) | 12 | 10,6 | 5,30 | pendiente |  | Pendiente de entrega: no existe `.github/` en ninguna rama (solo `main`), no hay PRs ni ejecuciones en Actions. |
| Presentación (por definir) | 16 | 15,9 | 7,95 | pendiente |  | Pendiente: todavía no la hicieron. |
| Informe de una página | 12 | 12,8 | 6,40 | pendiente |  | Pendiente de entrega: `docs/clase12-m2-reporte.md` es el reporte de seguridad y accesibilidad, no este informe. |
| **Total por equipo** | | **87,0** (42,4 ya calificados) | **43,50** | 96,3 (promedio ponderado de lo calificado) | **20,41** | Faltan por entregar: Taller de refinamiento, Pipeline, Presentación e Informe de una página. |
| Tareas individuales (Moodle 6, participación 5, cuestionario clase 1 2; pesos provisorios) |  | 13 | 6,50 |  | pendiente | Se llevan aparte, ver `Calificacion_final.md`. |
| **Proyecto final corregido** |  |  | **50,00** | pendiente | pendiente | Vale el 50 % de la nota final. Se califica después de que arreglen lo señalado en estas tareas. |
| **Total del curso** |  |  | **100,00** |  | **20,41** de 100 (hasta ahora; faltan individuales y proyecto final) | 43,50 (equipo) + 6,50 (individuales) + 50,00 (proyecto) |

_Los 13 de peso restantes de las tareas (6,5 puntos del curso: Moodle 6, participación 5, cuestionario clase 1 2) son individuales. Pesos provisorios, pendientes de confirmar._

## Proyecto corregido

| Concepto | Nota | Observaciones |
|---|---|---|
| Nota del proyecto corregido (incluye Rúbrica C de Pact) | | |

## Sugerencias de arreglo para el equipo (2026-11-17)

Notas en escala 0-100. Los "GitHub issues" son los tickets de la pestaña Issues del repo.

### Pipeline
- **Falta `ci.yml`:** crear `.github/workflows/ci.yml` con 5 jobs independientes, sin `needs` (build del servidor, lint, tests, cobertura y build del cliente), cada uno con `actions/setup-node` y `cache: npm`. Hasta 50 puntos.
- **ESLint sin instalar:** `server/package.json` tiene el script `lint` pero ESLint no está en las dependencias y falta `eslint.config`. Instalarlo y commitear el config, o el job de lint queda rojo. 5 puntos.
- **Job de E2E (opcional):** checkout, setup-node con cache, `npm ci`, `npx playwright install --with-deps chromium` y `npm run test:e2e`, subiendo el reporte como artefacto. 3 puntos.

### Informe de una página
- **Falta el informe:** una sola página con una tabla de métricas del pipeline (tests pasados y fallados, cobertura, resultado de E2E) y una recomendación explícita de liberar o no. Que los números salgan del repo.

### Taller de refinamiento
- **Falta la entrega:** una épica dividida en user stories con criterios INVEST, 3 o 4 criterios de aceptación por historia y escenarios Gherkin, guardada en `docs/`.

### Integration + cobertura + refactor
- **Smells sin documentar:** agregar a `docs/` una tabla "smell, dónde estaba, refactor que lo resolvió, commit". Hasta 5 puntos.
- **Refactor sin tests de caracterización:** antes de refactorizar, escribir tests que fijen el comportamiento actual, y verificar que pasen antes y después. Hasta 5 puntos.

### Postman + Supertest
- **Reportes de bug incompletos:** en `server/tests/BUG_REPORT.md` (y el xlsx) sumar entorno, reproducibilidad y el criterio de la spec con su ID, o apuntar a los issues #1 a #5 que ya los tienen. Hasta 5 puntos.

### Seguridad + accesibilidad
- **CVSS inconsistente:** recalcular con la calculadora de first.org/cvss/calculator/3.1. El vector `AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:H` da 8,3 (no 8,1); `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` da 9,1 (no 8,1) y `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N` da 6,5 (no 5,3). Completar también los vectores de SEC-05 y SEC-06, y unificar los IDs: SEC-02 significa cosas distintas en `security/REPORTE.md` y en `docs/clase12-m2-reporte.md`. Hasta 5 puntos.

### Pendientes de entrega
- Taller de refinamiento, Pipeline (`ci.yml` y job de E2E), Presentación e Informe de una página.
