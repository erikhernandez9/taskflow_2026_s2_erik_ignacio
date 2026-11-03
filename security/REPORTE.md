# Reporte de seguridad y accesibilidad — TaskFlow (Clase 12)

Auditoría sobre TaskFlow corriendo **en local**. Tres herramientas, como pide el
práctico: OWASP ZAP (DAST), `npm audit` (SCA) y axe-core sobre Playwright (WCAG).
Lo que una herramienta no detecta —autorización, JWT, lógica de negocio— se
verificó a mano. La severidad usa CVSS v3.1; los vectores son estimados.

- Commit auditado: `1296d38`
- Entorno: macOS 27.2 · API Node 24 (Express + SQLite) · Chromium (Playwright 1.63.0) · 2026-11-03
- Evidencia: `security/zap/reports/` (ZAP), `security/evidencia/axe/` (axe), y la salida de `npm audit`

> El active scan de ZAP envía payloads hostiles y escribe datos. Se corre solo
> contra el entorno propio en local, nunca en staging ajeno ni en producción.

## Resumen de hallazgos

| ID | Título | OWASP | Severidad | CVSS |
|----|--------|-------|-----------|------|
| SEC-01 | IDOR: editar/borrar tareas de otro proyecto | A01 Broken Access Control | HIGH | 8.1 |
| SEC-02 | Toma de cuenta: forgot-password devuelve el token de reseteo | A07 Identification & Auth Failures | HIGH | 8.1 |
| SEC-03 | Secreto del JWT con valor por defecto en el código | A02 Cryptographic Failures | ALTO/CRÍTICO (condicional) | 9.8 si se despliega sin `JWT_SECRET` |
| SEC-04 | Mass assignment: `status` y `createdAt` arbitrarios al crear tarea | A04 Insecure Design | MEDIUM | 5.3 |
| SEC-05 | Security misconfiguration: sin headers de seguridad | A05 Security Misconfiguration | MEDIUM | 5.3 |
| SEC-06 | Enumeración de cuentas en forgot-password / login | A07 Identification & Auth Failures | MEDIUM | 5.3 |
| SEC-07 | Dependencias con CVEs conocidos (`npm audit`) | A06 Vulnerable Components | MEDIUM | — |
| ACC-01 | Inputs sin label asociado en el detalle de tarea | WCAG 4.1.2 (A) | — | crítico (axe) |

SEC-01 y SEC-02 ya estaban reportados como bugs funcionales en `docs/issues/`
(`01`, `02`, `06`, `07`); acá se re-enfocan desde la seguridad, con CVSS.

---

## SEC-01 · IDOR en PATCH y DELETE /api/tasks/:id

- **Severidad:** HIGH · CVSS 8.1 (`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:H`, estimado)
- **Descripción:** cualquier usuario autenticado puede editar o borrar tareas de
  un proyecto del que no es miembro. `GET /tasks/:id` sí devuelve 403; `PATCH` y
  `DELETE` no tienen el middleware de membresía.
- **Pasos:**
  1. Login como A, crear un proyecto y una tarea.
  2. Login como B (no miembro de ese proyecto).
  3. `PATCH /api/tasks/{id de A}` con `{ "title": "editada por intruso" }` → **200**.
  4. `DELETE /api/tasks/{id de A}` → **204**.
- **Impacto:** manipulación y borrado de datos de cualquier proyecto por cualquier cuenta.
- **Remediación:** agregar `requireTaskProjectMember('taskId')` a las rutas `PATCH`
  y `DELETE` en `server/src/modules/tasks/tasks.routes.ts`.
- **Evidencia:** `docs/issues/01-patch-tarea-sin-membresia.md`, `02-delete-...`

## SEC-02 · Toma de cuenta vía forgot-password

- **Severidad:** HIGH · CVSS 8.1 (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`, estimado)
- **Descripción:** `POST /api/auth/forgot-password` devuelve el token de reseteo
  **en el cuerpo de la respuesta HTTP**. Cualquiera que conozca un email puede
  pedir el token y resetear la contraseña sin acceso al correo de la víctima.
- **Pasos:**
  1. `POST /api/auth/forgot-password` con el email de la víctima → 200 con `token`.
  2. `POST /api/auth/reset-password` con ese token y una contraseña nueva → 200.
  3. Login con la contraseña del atacante → 200.
- **Impacto:** toma de cuenta total, sin login previo y sin acceso al email.
- **Remediación:** enviar el token por email y no devolverlo en la respuesta. Es
  un atajo de desarrollo (el proyecto no tiene servicio de correo), pero no puede
  llegar a producción así.
- **Evidencia:** `docs/issues/06-forgot-password-revela-emails.md`

## SEC-03 · Secreto del JWT con valor por defecto en el código

- **Severidad:** ALTO en desarrollo / **CRÍTICO 9.8** si se despliega sin `JWT_SECRET`
- **Descripción:** `server/src/middleware/auth.ts` usa
  `process.env.JWT_SECRET ?? 'taskflow-dev-secret'`. Si la variable no está
  definida, el secreto queda fijo y público en el repo: cualquiera puede forjar un
  token válido para cualquier usuario.
- **Verificación:** inspección de código. No se forjó ningún token contra un
  entorno real; la prueba queda descrita, no ejecutada contra producción.
- **Impacto:** si se despliega sin la variable, ruptura total de la autenticación.
- **Remediación:** exigir `JWT_SECRET` y abortar el arranque si falta; nunca dejar
  un default. Además, el token vive 24 h sin refresh ni revocación: a revisar.

## SEC-04 · Mass assignment al crear tarea

- **Severidad:** MEDIUM · CVSS 5.3 (`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`, estimado)
- **Descripción:** `createTask` hace `data: { ...body, ... }`, así que acepta
  campos que no deberían venir del cliente. Se puede crear una tarea que **nace en
  `DONE`** (saltea la máquina de estados de US-06) y con un `createdAt` arbitrario.
- **Pasos:**
  1. `POST /api/projects/{id}/tasks` con `{ "title": "x", "status": "DONE" }` → la tarea se crea en `DONE`.
  2. Con `{ "title": "x", "createdAt": "2000-01-01T00:00:00.000Z" }` → la fecha se persiste tal cual.
- **Impacto:** se evade la regla de negocio de transiciones y se falsean timestamps
  de auditoría.
- **Remediación:** en `tasks.service.ts`, construir el `data` con una lista blanca
  de campos en vez de propagar el body completo.

## SEC-05 · Security misconfiguration: faltan headers

- **Severidad:** MEDIUM · CVSS 5.3 (estimado)
- **Descripción (ZAP):** la API y el frontend no envían `X-Content-Type-Options`,
  `Content-Security-Policy`, `X-Frame-Options` ni `Permissions-Policy`; CORS está
  abierto (`Access-Control-Allow-Origin: *`) y la API expone `X-Powered-By: Express`.
- **Impacto:** facilita clickjacking, XSS y reconocimiento del stack.
- **Remediación:** middleware `helmet` en Express, `app.disable('x-powered-by')`, y
  CORS restringido al origen del frontend.
- **Evidencia:** `security/zap/reports/api-report.html`, `web-report.html`.

## SEC-06 · Enumeración de cuentas

- **Severidad:** MEDIUM · CVSS 5.3 (estimado)
- **Descripción:** `forgot-password` responde 404 para un email inexistente y 200
  para uno registrado, así que revela qué direcciones tienen cuenta. En login hay
  bloqueo a los 5 intentos fallidos (15 min), pero responde 401, no 429, y el
  bloqueo es por cuenta: no frena el rociado de contraseñas sobre muchas cuentas.
- **Remediación:** respuesta idéntica exista o no la cuenta; rate limiting por IP
  con 429; considerar que el lockout por cuenta puede ser un vector de DoS.
- **Evidencia:** `docs/issues/06`, `07`.

## SEC-07 · Dependencias con CVEs (`npm audit`)

- **Severidad:** MEDIUM (mayormente DoS y dependencias de desarrollo)
- **Hallazgos:** raíz 1 crítica (`shell-quote`); `server/` 7 high (`express`,
  `body-parser`, `path-to-regexp`, `prisma`…); `client/` 5 high (`vite`,
  `react-router-dom`, `@remix-run/router`…).
- **Remediación:** `npm audit fix`; subir `express`, `vite` y `react-router-dom` a
  versiones parcheadas; agregar `npm audit --audit-level=high` al CI.
- **Evidencia:** `npm audit` en cada paquete.

## ACC-01 · Inputs sin label en el detalle de tarea

- **Severidad:** crítica según axe · WCAG 4.1.2 Nombre, función, valor (nivel A)
- **Descripción (axe-core):** en `/projects/:id/tasks/:id`, el input de agregar
  etiqueta (`tag-add-input`) y el textarea de comentario (`comment-add-input`) no
  tienen label asociado. Un lector de pantalla no anuncia para qué es cada campo.
  Las otras 7 vistas dan 0 violaciones.
- **Remediación (aplicada):** se agregó `aria-label` a los dos controles en
  `client/src/pages/TaskDetailPage.tsx`; verificado con el test de `a11y.spec.ts`.
  Ver `docs/clase12-m2-reporte.md`.
- **Evidencia:** `security/evidencia/axe/detalle-tarea.json` y la captura
  `detalle-tarea-fallo.png`.

## Qué se probó y está bien

- **Inyección SQL:** Prisma parametriza las consultas; ZAP no reporta inyección.
- **XSS almacenado:** el título se guarda sin sanitizar, pero React escapa al
  renderizar y no hay `dangerouslySetInnerHTML`, así que no se ejecuta en la UI
  actual. Igual conviene sanitizar en el servidor por defensa en profundidad.
- **Hashing de contraseñas:** bcrypt con salt (cost 10). Cumple A04.

## Automatizable vs. manual

| Hallazgo | Cómo se detectó |
|----------|-----------------|
| SEC-05, SEC-07, inyección | Automático (ZAP, npm audit) |
| ACC-01 | Automático (axe-core en el build) |
| SEC-01, SEC-02, SEC-03, SEC-04, SEC-06 | Manual: autorización, JWT y lógica de negocio |

Regla del curso: lo que tiene firma conocida se automatiza; lo que depende de
reglas de negocio hay que pensarlo.
