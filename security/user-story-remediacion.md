# US de remediación — Control de acceso y headers de seguridad

> Entregable opcional del práctico de la Clase 12: convertir una deuda de
> seguridad en una User Story con criterios de aceptación testeables.

**Como** equipo de producto de TaskFlow,
**quiero** que un usuario solo pueda operar sobre tareas de proyectos de los que
es miembro, y que la API no filtre información de infraestructura,
**para** proteger los datos de todos los usuarios y cerrar los hallazgos SEC-01 y
SEC-05.

## Criterios de aceptación (verificables)

- **CA-SEC-01:** `PATCH /api/tasks/:id` y `DELETE /api/tasks/:id` devuelven **403**
  a un usuario autenticado que no es miembro del proyecto de la tarea.
  *Verifica:* `server/tests/tasks-lifecycle.test.ts` (HALLAZGO #1 / #1 bis) pasa a verde.
- **CA-SEC-02:** la respuesta de la API incluye `X-Content-Type-Options: nosniff`
  y no incluye `X-Powered-By`.
  *Verifica:* ZAP active scan sin WARN de esos headers; un test de integración que
  chequee las cabeceras de `GET /api/health`.
- **CA-SEC-03:** el active scan de ZAP no reporta issues de severidad alta o crítica.
  *Verifica:* `security/zap/run-zap.sh` con 0 FAIL.

## Definition of Done (con seguridad y accesibilidad)

A lo que ya pedía el equipo, se agrega:

- [ ] ZAP / `npm audit`: sin issues críticos o altos.
- [ ] axe-core: 0 violaciones WCAG 2.1 AA en las vistas tocadas (ver ACC-01).
- [ ] Navegación del flujo afectado 100 % funcional por teclado.

## Fuera de alcance (otras US)

SEC-02 (token de reseteo en la respuesta), SEC-03 (secreto del JWT), SEC-04 (mass
assignment) y SEC-06 (enumeración) se tratan en US separadas: cada una tiene su
propio criterio testeable en `security/REPORTE.md`.
