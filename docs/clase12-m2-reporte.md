# Clase 12 · Módulo 2 — Reporte de seguridad y accesibilidad

Auditoría de TaskFlow corriendo **en local**, siguiendo la guía de práctica.

> La guía está escrita sobre un repo de referencia (monorepo `apps/api` + `apps/web`,
> PostgreSQL, puerto 3001, usuarios `alice`/`bob`). Este repo es distinto: `server/` +
> `client/`, SQLite, API en `:3000`, usuarios del seed `ana@test.com` y `bob@test.com`.
> Los comandos y el `a11y.spec.ts` se adaptaron a esta estructura.

- Entorno: macOS 27.2 · API Node 24 (Express + SQLite) · Chromium (Playwright 1.63.0) · 2026-11-03
- Commit auditado: `1296d38`
- Evidencia extra: `security/` (ZAP, axe JSON, captura). ZAP es un agregado al práctico.

---

## Parte 2 — Análisis de dependencias (`npm audit`)

Dos vulnerabilidades HIGH analizadas:

| Vulnerabilidad | ¿Producción o dev? | ¿Fix? ¿Breaking? |
|----------------|--------------------|------------------|
| `body-parser` / `path-to-regexp` (vía `express`, server) | **Producción** (la API los usa en runtime) | Hay fix, pero vía `npm audit fix --force`: sube `express` de major → **breaking** |
| `react-router-dom` / `@remix-run/router` (client) | **Producción** (el frontend lo usa en runtime) | Hay fix; XSS vía open redirect. Subir la dependencia, revisar rutas |

`--omit=dev`: server 6 high, client 3 high. El resto de los high/moderate son de
herramientas de desarrollo y test (jest, ts-node-dev, vite, esbuild): no viajan a
producción, así que su riesgo real es menor aunque npm los marque high.

---

## Parte 2 — Headers de seguridad (`curl -I`)

| Header | ¿Aparece? | Observación |
|--------|-----------|-------------|
| `Content-Security-Policy` | ❌ No | Falta: no hay mitigación de XSS a nivel navegador |
| `Strict-Transport-Security` | ❌ No | Falta: configuración pendiente para producción (HTTPS) |
| `X-Frame-Options` | ❌ No | Falta: la app se puede embeber en un iframe (clickjacking) |
| `X-Content-Type-Options` | ❌ No | Falta: el navegador puede adivinar el tipo de contenido |
| `X-Powered-By` | ⚠️ Sí, `Express` | **Sobra**: revela el framework del servidor |
| `Access-Control-Allow-Origin` | ⚠️ `*` | Demasiado permisivo: cualquier sitio llama a la API desde el navegador |

---

## 4.1 Hallazgos de seguridad

### Hallazgo de Seguridad N.º 01

| Campo | Contenido |
|-------|-----------|
| **ID** | SEC-01 |
| **Título** | IDOR: un usuario edita o borra tareas de un proyecto donde no es miembro |
| **Severidad** | **HIGH** · CVSS (opcional): 8.3 (`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:H`) |
| **Descripción** | `PATCH /api/tasks/:id` y `DELETE /api/tasks/:id` no verifican membresía en el proyecto. `GET` sí devuelve 403; los de escritura no. |
| **Pasos** | 1. Login como A; crear proyecto y tarea. 2. Login como B (no miembro). 3. `PATCH /api/tasks/{id de A}` con `{"status":"IN_PROGRESS"}` → **200**. 4. `DELETE /api/tasks/{id de A}` → **204**. |
| **Impacto** | Cualquier cuenta autenticada modifica o borra datos de cualquier proyecto. Ruptura de control de acceso (OWASP A01). |
| **Remediación** | Agregar `requireTaskProjectMember('taskId')` a las rutas `PATCH` y `DELETE` en `server/src/modules/tasks/tasks.routes.ts`. |

### Hallazgo de Seguridad N.º 02

| Campo | Contenido |
|-------|-----------|
| **ID** | SEC-05 (mismo ID que en `security/REPORTE.md`) |
| **Título** | Faltan headers de seguridad y `X-Powered-By` / CORS exponen de más |
| **Severidad** | **MEDIUM** · CVSS (opcional): 4.3 (`AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N`) |
| **Descripción** | La API no envía `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` ni `X-Content-Type-Options`; expone `X-Powered-By: Express` y responde `Access-Control-Allow-Origin: *`. |
| **Pasos** | 1. `curl -I http://localhost:3000/api/health`. 2. `curl -I http://localhost:3000/api/projects -H "Authorization: Bearer $TOKEN"`. 3. Ver la tabla de headers de arriba. |
| **Impacto** | Facilita clickjacking, XSS y reconocimiento del stack. Security misconfiguration (OWASP A05). |
| **Remediación** | Middleware `helmet` en Express, `app.disable('x-powered-by')` y CORS restringido al origen del frontend. |

Otros hallazgos verificados (detalle en `security/REPORTE.md`, con los mismos IDs):
SEC-02, toma de cuenta vía `forgot-password` que devuelve el token en la respuesta
(CRITICAL 9.1); SEC-03, secreto del JWT con default en el código (CRITICAL 9.8 si se
despliega sin `JWT_SECRET`); SEC-04, mass assignment al crear tarea
(`status`/`createdAt` arbitrarios, MEDIUM 6.5); y SEC-06, enumeración de cuentas en
`forgot-password` (404 vs 200, MEDIUM 5.3).

## 4.2 Control verificado (lo que sí funciona)

| Campo | Contenido |
|-------|-----------|
| **Qué se probó** | Inyección SQL en login y en el buscador, y token sin firma (`alg:none`) |
| **Resultado esperado** | El payload de SQLi se trata como dato, no altera la consulta; el token sin firma se rechaza |
| **Resultado obtenido** | Login con `' OR '1'='1' --` → **401**. Search con el mismo payload → **200** tratándolo como texto de búsqueda literal (no expone datos). Token `alg:none` en `GET /projects` → **401**. Asignar una tarea a un no-miembro → **400**. |
| **Qué parte del código lo explica** | Prisma parametriza todas las consultas (`tasks.repository.ts` usa `where`, no SQL armado a mano), así que la inyección no aplica. `jsonwebtoken.verify` en `server/src/middleware/auth.ts` rechaza `alg:none` por defecto. |

## 4.3 Hallazgos de accesibilidad

### Hallazgo de Accesibilidad N.º 01

| Campo | Contenido |
|-------|-----------|
| **ID** | ACC-01 |
| **SC WCAG 2.1** | 4.1.2 Nombre, función, valor · **Nivel A** |
| **Principio POUR** | Robusto |
| **Cómo se detectó** | axe-core (impact `critical`) |
| **Vista afectada** | Detalle de tarea |
| **Descripción** | `tag-add-input` (etiqueta) y `comment-add-input` (comentario) no tienen label asociado: un lector de pantalla no anuncia para qué es cada campo. |
| **Fix propuesto** | Agregar `aria-label` a cada control. **Aplicado** en `client/src/pages/TaskDetailPage.tsx` (`aria-label="Nueva etiqueta"` y `"Nuevo comentario"`); verificado con el test (ver más abajo). |

### Hallazgo de Accesibilidad N.º 02

| Campo | Contenido |
|-------|-----------|
| **ID** | ACC-02 |
| **SC WCAG 2.1** | 2.4.6 Encabezados y etiquetas / 4.1.2 · **Nivel AA / A** |
| **Principio POUR** | Comprensible / Robusto |
| **Cómo se detectó** | Revisión manual (axe no lo marca: el botón tiene texto) |
| **Vista afectada** | Detalle de tarea |
| **Descripción** | El botón de quitar etiqueta (`tag-remove-button`) tiene como contenido solo `×`. Un lector de pantalla lo anuncia como "signo de multiplicación", sin decir qué hace ni a qué etiqueta aplica. |
| **Fix propuesto** | Darle un nombre accesible descriptivo: `aria-label={`Quitar etiqueta ${tag.name}`}`. |

### Hallazgo de Accesibilidad N.º 03

| Campo | Contenido |
|-------|-----------|
| **ID** | ACC-03 |
| **SC WCAG 2.1** | 2.4.6 Encabezados y etiquetas · **Nivel AA** |
| **Principio POUR** | Comprensible |
| **Cómo se detectó** | Revisión manual |
| **Vista afectada** | Tablero |
| **Descripción** | Cada tarjeta repite el mismo label "Estado" en su `select` (`task-card-status-select`). Con varias tarjetas, un lector de pantalla escucha "Estado" muchas veces sin poder distinguir de qué tarea es cada uno. |
| **Fix propuesto** | Incluir el título de la tarea en el nombre accesible del select, por ejemplo `aria-label={`Estado de ${task.title}`}`. |

Revisión manual adicional que **sí** cumple: `index.html` declara `lang="es"`; el
mensaje de error de login usa `role="alert"`, así que un lector lo anuncia.

## 4.4 User Stories de remediación

### US de Seguridad — hallazgo más crítico (SEC-01, IDOR)

> De los dos hallazgos de esta plantilla, SEC-01 es el más grave. En el reporte
> completo, SEC-02 (9.1) puntúa más alto; está en el issue #6 y su remediación es no
> devolver el token en la respuesta (ver `security/REPORTE.md`).

- **Como** equipo de producto de TaskFlow,
- **Quiero** que solo los miembros de un proyecto puedan modificar sus tareas,
- **Para** que ninguna cuenta pueda alterar datos de proyectos ajenos.

| CA | Criterio (verificable) |
|----|------------------------|
| CA-01 | `PATCH /api/tasks/:id` de un no-miembro responde **403** (lo verifica `tasks-lifecycle.test.ts`, HALLAZGO #1) |
| CA-02 | `DELETE /api/tasks/:id` de un no-miembro responde **403** (HALLAZGO #1 bis) |
| CA-03 | El active scan de ZAP no reporta issues de control de acceso de severidad alta |

### US de Accesibilidad — hallazgo más grave (ACC-01, labels)

- **Como** usuaria con lector de pantalla,
- **Quiero** que cada campo del detalle de tarea tenga un nombre accesible,
- **Para** saber qué estoy completando sin ver la pantalla.

| CA | Criterio (verificable) |
|----|------------------------|
| CA-01 | axe-core no reporta la regla `label` en la vista Detalle de tarea (test de verificación en `a11y.spec.ts`, en verde) |
| CA-02 | `tag-add-input` y `comment-add-input` tienen un nombre accesible no vacío |
| CA-03 | El flujo de agregar etiqueta y comentario se completa solo con teclado |

---

## Corrección aplicada y verificación (rojo → verde)

Se corrigió ACC-01 en `client/src/pages/TaskDetailPage.tsx`. El test de verificación
de `e2e/specs/a11y.spec.ts` tiene `VERIFICAR.regla = 'label'`:

- **Sin el fix:** `Detalle de tarea: 1 regla(s) violada(s)` → `[CRITICAL] label — SC 4.1.2`, y el test de verificación **falla** (rojo).
- **Con el fix:** `Detalle de tarea: 0 regla(s) violada(s)`, y el test **pasa** (verde).

```bash
npx playwright test a11y --project=chromium
```

Los `data-testid` no cambiaron, así que el resto de la suite E2E sigue pasando.
