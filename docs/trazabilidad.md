# Matriz de trazabilidad: historia → criterio → test → resultado

Clase 12, Proyecto Integrador. Una fila por criterio de aceptación de las 17 historias de la especificación (v1.0). La regla de la clase: **un criterio sin test, o un test sin criterio, es un hueco en la trazabilidad.**

- Fecha: 2026-11-24 · rama `agregar-ci`.
- Resultados de la API (Jest, `server/tests/`): 196 tests, 130 verdes y 66 rojos, corridos con `TZ=America/Montevideo`, igual que el job `tests` del pipeline.
- Resultados E2E (Playwright, `e2e/specs/`): 70 tests, 63 pasan y 7 fallan (US-15 c1 y c3; US-16 c2, c3 y c7 por el bug #4), corridos con `TZ=America/Montevideo`, igual que el job `e2e` del pipeline ([run 45474481488](https://github.com/erikhernandez9/taskflow_2026_s2_erik_ignacio/actions/runs/45474481488)).
- "Rojo (#N)" apunta al issue de `docs/issues/NN-*.md` que explica la falla. Un criterio es "Verde" solo si todos sus tests lo son; si hay uno rojo, el criterio queda rojo.
- Los contract tests de Pact (`server/contract-tests/`) no entran en estos resultados y no se cuentan.

## Resumen

| Historia | Criterios | Con al menos un test | Todos sus tests verdes | Con algún rojo | Sin test |
|---|---:|---:|---:|---:|---:|
| US-01 Registro | 7 | 5 | 5 | 0 | 2 |
| US-02 Login | 7 | 3 | 3 | 0 | 4 |
| US-03 Crear proyecto | 6 | 6 | 5 | 1 | 0 |
| US-04 Listar proyectos | 4 | 3 | 3 | 0 | 1 |
| US-05 Crear tarea | 6 | 6 | 6 | 0 | 0 |
| US-06 Cambiar estado | 7 | 6 | 5 | 1 | 1 |
| US-07 Filtrar y buscar | 8 | 8 | 6 | 2 | 0 |
| US-08 Comentar | 6 | 2 | 2 | 0 | 4 |
| US-09 Editar proyecto | 7 | 7 | 7 | 0 | 0 |
| US-10 Eliminar proyecto | 7 | 6 | 4 | 2 | 1 |
| US-11 Miembros | 7 | 4 | 4 | 0 | 3 |
| US-12 Editar tarea | 7 | 7 | 6 | 1 | 0 |
| US-13 Eliminar tarea | 5 | 4 | 3 | 1 | 1 |
| US-14 Asignar tarea | 6 | 6 | 6 | 0 | 0 |
| US-15 Etiquetas | 7 | 3 | 1 | 2 | 4 |
| US-16 Vencimiento | 8 | 8 | 0 | 8 | 0 |
| US-17 Recuperar contraseña | 8 | 8 | 3 | 5 | 0 |
| **Total** | **113** | **92** | **69** | **23** | **21** |

**Cobertura: 92 de 113 criterios tienen al menos un test, es decir 81,4 %.** De esos 92, 69 están todos verdes (61,1 % del total) y 23 tienen algún rojo (20,4 %). Quedan 21 sin test (18,6 %).

Ojo con US-16: los 8 criterios aparecen rojos porque la suite de la API corre con `TZ=America/Montevideo` y el bug #4 corre la fecha un día. Con `TZ=UTC` pasarían casi todos (ver el detalle en [`docs/ia/ejercicio-2-us16.md`](ia/ejercicio-2-us16.md)), pero el pipeline fija la zona de nuestras máquinas para que el bug no quede oculto.

## Detalle por épica

Convenciones de la columna Tests: `API` es un archivo de `server/tests/` (sin la extensión `.test.ts`); `E2E` es un archivo de `e2e/specs/`. `(car.)` marca un test de `characterization`: fija comportamiento actual, pero prueba el criterio igual. `(parcial)` marca un criterio del que el test solo cubre una parte.

### Épica 1: Autenticación y acceso

| Historia | Criterio | Tests | Resultado |
|---|---|---|---|
| US-01 | c1: email con formato válido | API `characterization` › (b) register rechaza 5 emails inválidos y acepta 2 válidos (car.) · E2E `auth` › registrarse con un email inválido muestra el error | Verde |
| US-01 | c2: email normalizado a minúsculas | API `characterization` › (b) register acepta `Car.B.Mayus@Test.COM` y devuelve el email en minúsculas (car.) | Verde |
| US-01 | c3: contraseña mínimo 8, 1 número, 1 mayúscula | Sin test sobre `/auth/register`. Los de `password-reset` › c7 prueban la misma regla, pero en `/auth/reset-password` (ver Huecos) | Sin test |
| US-01 | c4: email repetido, 409 | E2E `auth` › registrarse con un email ya usado muestra el conflicto | Verde |
| US-01 | c5: 201 y JWT | API `auth` › registra un usuario nuevo (solo mira el 201, no el token) · E2E `auth` › registrarse desde la UI entra a proyectos | Verde |
| US-01 | c6: validación, 400 con mensaje | API `characterization` › (b) email inválido responde 400 (car.; no mira el texto del mensaje) | Verde |
| US-01 | c7: la contraseña no se devuelve | Sin test | Sin test |
| US-02 | c1: login 200 con JWT de 24 h | API `auth` › inicia sesión con credenciales válidas (solo 200; no mira la expiración) (parcial) · E2E `auth` › iniciar sesión muestra el email en el header | Verde |
| US-02 | c2: credenciales incorrectas, 401 | API `auth` › rechaza el login con contraseña incorrecta · E2E `auth` › contraseña incorrecta muestra el error | Verde |
| US-02 | c3: mismo mensaje para email inexistente y contraseña mala | E2E `auth` › email inexistente también cae en credenciales inválidas | Verde |
| US-02 | c4: bloqueo a los 5 intentos por 15 min | Sin test | Sin test |
| US-02 | c5: el contador se reinicia tras un login exitoso | Sin test | Sin test |
| US-02 | c6: el bloqueo se levanta a los 15 min | Sin test | Sin test |
| US-02 | c7: el token incluye el userId | Sin test | Sin test |
| US-17 | c1: el reseteo se pide con el email | API `password-reset` › c2 email registrado responde 200 y genera token · c1 un token válido cambia la contraseña | Verde |
| US-17 | c2: respuesta idéntica exista o no el email | API `password-reset` › c2 un email inexistente responde 200, igual que uno registrado | Rojo (#6) |
| US-17 | c3: token de un solo uso | API `password-reset` › c3/c5 un token ya utilizado no se puede reutilizar | Rojo (#7) |
| US-17 | c4: el token expira a los 60 min | API `password-reset` › c4 el token expira a los 60 minutos | Verde |
| US-17 | c5: vencido, inexistente o usado, 400 | API `password-reset` › c5 inexistente (verde) · c5 vencido (rojo) · c3/c5 ya utilizado (rojo) | Rojo (#7) |
| US-17 | c6: un token nuevo invalida los anteriores | API `password-reset` › c6 generar un token nuevo invalida el anterior | Rojo (#7) |
| US-17 | c7: misma regla de contraseña que el registro | API `password-reset` › c7 (4 tests): 7 caracteres (rojo), sin número, sin mayúscula, 8 exactos | Rojo (#8) |
| US-17 | c8: el reseteo reinicia intentos y desbloquea | API `password-reset` › c8 un reseteo exitoso desbloquea la cuenta | Verde |

### Épica 2: Gestión de proyectos

| Historia | Criterio | Tests | Resultado |
|---|---|---|---|
| US-03 | c1: nombre obligatorio, 3 a 100 | API `projects-name-validation` › 201 caracteres rechazado (verde) · HALLAZGO #5 nombre de 2 (rojo) · HALLAZGO #5 bis nombre vacío (rojo) · E2E `projects` › más de 100 caracteres muestra el error | Rojo (#5) |
| US-03 | c2: descripción opcional, máx. 500 | E2E `projects` › un proyecto sin descripción muestra el texto por defecto (el máximo de 500 no se prueba en la creación) (parcial) | Verde |
| US-03 | c3: el creador queda como owner y miembro | E2E `members` › el owner aparece en la lista de miembros | Verde |
| US-03 | c4: nombre repetido, 409 | E2E `projects` › repetir el nombre de un proyecto propio muestra el conflicto | Verde |
| US-03 | c5: 201 con id generado | API `projects` › crea un proyecto (solo mira el 201) · E2E `projects` › crear un proyecto lo agrega a la lista | Verde |
| US-03 | c6: sin autenticación, 401 | API `projects` › rechaza crear un proyecto sin autenticación | Verde |
| US-04 | c1: solo owner o miembro | API `projects` › lista los proyectos del usuario · `characterization` › (e) GET owner y miembro ven el proyecto, el no miembro no (car.) · E2E `projects` › la lista muestra solo los proyectos del usuario | Verde |
| US-04 | c2: los archivados no aparecen | Sin test | Sin test |
| US-04 | c3: id, nombre, descripción y fecha | E2E `projects` › crear un proyecto lo agrega a la lista con su descripción (no mira la fecha de creación) (parcial) | Verde |
| US-04 | c4: sin proyectos, array vacío | E2E `projects` › un usuario nuevo ve el estado vacío | Verde |
| US-09 | c1: solo el owner edita, miembro 403 | API `projects-edit-delete` › c1 un miembro no owner recibe 403 y el proyecto no cambia | Verde |
| US-09 | c2: nombre 3 a 100 | API `projects-edit-delete` › c2 (4 tests): 2, 3, 100 y 101 caracteres | Verde |
| US-09 | c3: descripción máx. 500 | API `projects-edit-delete` › c3 (2 tests): 500 y 501 caracteres | Verde |
| US-09 | c4: unicidad al renombrar, 409 | API `projects-edit-delete` › c4 renombrar a un nombre propio ya usado | Verde |
| US-09 | c5: un solo campo, el otro se conserva | API `projects-edit-delete` › c5 enviar un solo campo conserva el otro | Verde |
| US-09 | c6: devuelve el proyecto completo | API `projects-edit-delete` › c6 el owner edita nombre y descripción | Verde |
| US-09 | c7: inexistente o ajeno, 404 | API `projects-edit-delete` › c7 · `characterization` › (e) PATCH no miembro 404 e inexistente 404 (car.) | Verde |
| US-10 | c1: solo el owner elimina, miembro 403 | API `projects-edit-delete` › c1 un miembro no owner recibe 403 y el proyecto sigue existiendo | Verde |
| US-10 | c2: eliminación física | Sin test: el único chequeo es que el proyecto no aparece en el listado, que no distingue borrado de archivado | Sin test |
| US-10 | c3: se eliminan sus tareas | API `projects-edit-delete` › c3 eliminar el proyecto elimina sus tareas | Verde |
| US-10 | c4: al borrar una tarea, sus comentarios, historial y etiquetas | API `projects-edit-delete` › c4/c5 no quedan comentarios ni historial (las etiquetas no se prueban) | Rojo (#9) |
| US-10 | c5: no queda ningún registro asociado | API `projects-edit-delete` › c4/c5 no quedan comentarios ni historial | Rojo (#9) |
| US-10 | c6: 204 sin cuerpo | API `projects-edit-delete` › c6 el owner elimina el proyecto: 204 sin cuerpo | Verde |
| US-10 | c7: inexistente, 404 | API `projects-edit-delete` › c7 · `characterization` › (e) DELETE (car.) | Verde |
| US-11 | c1: solo el owner agrega o quita, otros 403 | API `characterization` › (e) agregar miembro: solo el owner (car.) · E2E `members` › un miembro que no es owner ve la lista en solo lectura | Verde |
| US-11 | c2: alta por email, inexistente 404 | API `characterization` › (b) agregar miembro con email válido pero inexistente da 404 (car.) · E2E `members` › el owner agrega un miembro | Verde |
| US-11 | c3: miembro repetido, 409 | API `characterization` › (b) agregar miembro repetido da 409 (car.) | Verde |
| US-11 | c4: el owner no se quita a sí mismo | E2E `members` › el owner aparece en la lista y no se puede quitar a sí mismo (solo UI; no se prueba el 400 de la API) (parcial) | Verde |
| US-11 | c5: un miembro quitado deja de ver el proyecto | Sin test (E2E `members` › quitar un miembro saca la fila de la lista prueba la lista de miembros, no el `GET /projects` del quitado) | Sin test |
| US-11 | c6: sus tareas asignadas quedan sin asignado | Sin test | Sin test |
| US-11 | c7: un ex miembro no opera sobre las tareas, 403 | Sin test | Sin test |

### Épica 3: Gestión de tareas

| Historia | Criterio | Tests | Resultado |
|---|---|---|---|
| US-05 | c1: título 3 a 200 | API `tasks-lifecycle` › título (5 tests): 2, 3, 200, 201 y sin título · E2E `board-filters` › un título de menos de 3 caracteres muestra el error | Verde |
| US-05 | c2: prioridad LOW, MEDIUM, HIGH, CRITICAL | API `tasks-lifecycle` › priority (6 tests): los 4 valores, el default y un valor fuera del enum | Verde |
| US-05 | c3: el estado inicial es siempre TODO | API `tasks` › crea una tarea en un proyecto (verifica TODO; no envía un `status` distinto) (parcial) · E2E `board-filters` › crear una tarea la agrega a TODO | Verde |
| US-05 | c4: asignar a un miembro al crear (opcional) | API `tasks-lifecycle` › assigneeId (2 tests): rechaza a un no miembro y un id con formato inválido (el caso feliz solo se usa de pasada) (parcial) | Verde |
| US-05 | c5: solo miembros crean, 403 | API `tasks-lifecycle` › 403 rechaza crear tarea en un proyecto donde no soy miembro | Verde |
| US-05 | c6: 201 con id generado | API `tasks` › crea una tarea en un proyecto · E2E `board` › la tarjeta muestra los datos de la tarea | Verde |
| US-06 | c1: transiciones válidas | API `tasks-lifecycle` › 3 transiciones válidas (200) · `tasks` › avanza de TODO a IN_PROGRESS · E2E `board` › mover la tarjeta a IN_PROGRESS | Verde |
| US-06 | c2: TODO → DONE no permitido | API `tasks-lifecycle` › HALLAZGO #3 TODO → DONE debería ser inválida | Rojo (#3) |
| US-06 | c3: no se sale de DONE | API `tasks-lifecycle` › DONE → TODO y DONE → IN_PROGRESS (422) · E2E `task-edit` › volver atrás desde DONE muestra el error | Verde |
| US-06 | c4: transición inválida, 422 | API `tasks-lifecycle` › DONE → TODO y DONE → IN_PROGRESS responden 422 INVALID_TRANSITION | Verde |
| US-06 | c5: solo asignado o admin | API `tasks-lifecycle` › 403 un miembro que no es assignee ni admin · 200 el assignee sí puede · `characterization` › (a) (car.) | Verde |
| US-06 | c6: además, miembro vigente | Sin test | Sin test |
| US-06 | c7: historial con autor y timestamp | E2E `task-edit` › cambiar el estado suma una entrada al historial (no mira autor ni timestamp) (parcial) · API `characterization` › (a) un PATCH sin cambio de estado no escribe historial (car.) | Verde |
| US-07 | c1: filtro por status | API `tasks` › filtra las tareas por estado · `characterization` › (d) status solo (car.) · E2E `board-filters` / `board` | Verde |
| US-07 | c2: filtro por assignedTo | API `characterization` › (c) el filtro assignedTo devuelve solo las de ese usuario (car.) | Verde |
| US-07 | c3: filtro por priority | API `characterization` › (d) priority sola (car.) · E2E `board` › filtrar por prioridad | Verde |
| US-07 | c4: búsqueda en título y descripción, sin mayúsculas | API `characterization` › search no distingue mayúsculas y mira la descripción (car.) · E2E `board-filters` › buscar por texto | Verde |
| US-07 | c5: filtros combinables | API `characterization` › status + priority y status + priority + search devuelven la intersección (car.) | Verde |
| US-07 | c6: sin resultados, array vacío | API `characterization` › (d) un search sin coincidencias devuelve lista vacía (car.) · E2E `board-filters` › un filtro sin resultados deja el tablero vacío | Verde |
| US-07 | c7: paginado, 20 por defecto, limit y offset | API `listing-pagination` › respeta limit y offset · aplica un límite por defecto (el `limit` máximo de 100 no se prueba) | Rojo (#12) |
| US-07 | c8: incluye el total | API `listing-pagination` › respeta limit y offset (asserta `total`; el test falla por limit/offset, no por el total) | Rojo (#12) |
| US-12 | c1: editar título, descripción y prioridad | E2E `task-edit` › editar título y prioridad persiste tras recargar · API `characterization` › (a) PATCH con varios campos (car.) | Verde |
| US-12 | c2: título 3 a 200 | E2E `task-edit` › US-12 c2 acepta 200 y rechaza 201 · un título inválido no pisa el valor guardado | Verde |
| US-12 | c3: prioridad con 4 valores | API `characterization` › (a) rechaza valores inválidos de prioridad y título (car.) | Verde |
| US-12 | c4: un estado nuevo sigue las reglas de US-06 | API `tasks-lifecycle` › transiciones por PATCH · `characterization` › (a) DONE → TODO se rechaza con 422 (car.) · E2E `task-edit` › volver atrás desde DONE | Verde |
| US-12 | c5: solo miembros editan, 403 | API `tasks-lifecycle` › HALLAZGO #1 un no miembro no debería poder editar | Rojo (#1) |
| US-12 | c6: los campos ausentes se conservan | API `characterization` › (a) un body vacío devuelve la tarea sin cambios (car.) · `us16-due-date-ia` › c5 un PATCH sin dueDate conserva el vencimiento | Verde |
| US-12 | c7: inexistente, 404 | API `tasks-lifecycle` › 404 rechaza editar una tarea que no existe | Verde |
| US-13 | c1: solo miembros eliminan, 403 | API `tasks-lifecycle` › HALLAZGO #1 bis un no miembro no debería poder eliminar | Rojo (#2) |
| US-13 | c2: se borran comentarios, historial y etiquetas | Sin test (solo existe el equivalente a nivel proyecto, US-10 c4) | Sin test |
| US-13 | c3: 204 sin cuerpo | API `tasks-lifecycle` › 204 el owner puede eliminar una tarea · E2E `task-delete` › c3 | Verde |
| US-13 | c4: inexistente, 404 | API `tasks-lifecycle` › 404 eliminar una tarea inexistente · E2E `task-delete` › c4 | Verde |
| US-13 | c5: una tarea DONE también se borra | E2E `task-delete` › c5 una tarea en DONE también se puede borrar | Verde |

### Épica 4: Organización del trabajo del equipo

| Historia | Criterio | Tests | Resultado |
|---|---|---|---|
| US-14 | c1: solo miembros, si no 400 | API `tasks-lifecycle` › assigneeId rechaza a un no miembro (en la creación) · `characterization` › (a) PATCH rechaza un assignee no miembro con 400 (car.) · E2E `task-assign` › c1 | Verde |
| US-14 | c2: reasignar | E2E `task-assign` › c2 una tarea asignada se puede reasignar | Verde |
| US-14 | c3: desasignar con nulo | E2E `task-assign` › c3 elegir "Sin asignar" · API `characterization` › (a) assigneeId null desasigna (car.) | Verde |
| US-14 | c4: cualquier miembro asigna | E2E `task-assign` › c4 un miembro que no es owner también puede asignar | Verde |
| US-14 | c5: la asignación no cambia el estado | E2E `task-assign` › c5 se ve en el tablero y no cambia el estado | Verde |
| US-14 | c6: tarea inexistente, 404 | API `tasks-lifecycle` › 404 tarea inexistente (es el `PATCH` genérico; no hay un test propio de asignación) | Verde |
| US-15 | c1: minúsculas y sin espacios | E2E `task-edit` › US-15 c1 la etiqueta se guarda en minúsculas y sin espacios | Rojo (#10) |
| US-15 | c2: no distingue mayúsculas | Sin test (el test de c3 repite la misma cadena, no varía el caso) | Sin test |
| US-15 | c3: sin duplicados, 200 | E2E `task-edit` › US-15 c3 repetir una etiqueta no genera un duplicado | Rojo (#11) |
| US-15 | c4: 1 a 30 caracteres | E2E `task-edit` › US-15 c4 una etiqueta vacía muestra el error (solo el mínimo; el máximo de 30 no) (parcial) | Verde |
| US-15 | c5: máximo 10 etiquetas, 400 | Sin test | Sin test |
| US-15 | c6: quitar una etiqueta que no tiene, 404 | Sin test | Sin test |
| US-15 | c7: solo miembros etiquetan, 403 | Sin test | Sin test |
| US-16 | c1: día calendario sin hora | API `us16-due-date-ia` › c1 (5 tests: 2 de formato y 3 con hora rechazada) | Rojo (#4) |
| US-16 | c2: formato `YYYY-MM-DD` | API `us16-due-date-ia` › c2 (3 tests) · E2E `task-due-date` › c2 (2 tests, rojos por #4) | Rojo (#4) |
| US-16 | c3: misma fecha sin importar la zona | API `us16-due-date-ia` › c3 (14 tests) · `tasks-lifecycle` › HALLAZGO #4 · E2E `task-due-date` › c3 en Montevideo y Tokio (rojos por #4) | Rojo (#4) |
| US-16 | c4: opcional | API `us16-due-date-ia` › c4 (4 tests; 3 verdes) · E2E `task-due-date` › c4 | Rojo (#4) |
| US-16 | c5: se quita con `null` | API `us16-due-date-ia` › c5 (5 tests; 2 verdes) · E2E `task-due-date` › c5 | Rojo (#4) |
| US-16 | c6: formato inválido, 400 | API `us16-due-date-ia` › c6 (33 tests) · `tasks-lifecycle` › dueDate con formato inválido (verde) | Rojo (#4, #14) |
| US-16 | c7: se admite una fecha pasada | API `us16-due-date-ia` › c7 (5 tests) · E2E `task-due-date` › c7 (rojo por #4). "La tarea se considera vencida" no tiene test: no hay campo que lo exponga | Rojo (#4) |
| US-16 | c8: solo miembros modifican, 403 | API `us16-due-date-ia` › c8 (6 tests; 1 verde) | Rojo (#1, #4) |

Resumen detallado de US-16 por criterio y por zona horaria (UTC contra UTC-3), con los dos casos sin test: [`docs/ia/ejercicio-2-us16.md`](ia/ejercicio-2-us16.md#trazabilidad-de-us-16). En corto: con `TZ=UTC` pasan c1 a c5 y c7 completos, c6 queda con 7 rojos por #14 y c8 con 4 rojos por #1; con UTC-3 (la zona del pipeline) falla todo lo que lee una fecha por #4. Faltan dos casos: que una tarea con fecha pasada "se considera vencida" (c7) y que un miembro que no es el dueño sí puede modificar la fecha (c8).

### Épica 5: Comunicación en tareas

| Historia | Criterio | Tests | Resultado |
|---|---|---|---|
| US-08 | c1: comentario de 1 a 1000 caracteres | Sin test | Sin test |
| US-08 | c2: la longitud se valida en la API | Sin test | Sin test |
| US-08 | c3: autor y timestamp automáticos | E2E `task-detail` › cada comentario muestra su cuerpo y su autor (no mira el timestamp) (parcial) · API `comments` › agrega un comentario (solo mira el 201) | Verde |
| US-08 | c4: orden ascendente por fecha | Sin test (`comments` › devuelve los comentarios crea uno solo, no puede verificar el orden) | Sin test |
| US-08 | c5: solo miembros comentan, 403 | Sin test | Sin test |
| US-08 | c6: borrar el propio, el ajeno da 403 | E2E `task-detail` › solo los comentarios propios ofrecen borrar · borrar un comentario propio lo saca de la lista (solo UI; el 403 de la API no se prueba) (parcial) | Verde |

## Huecos

### Criterios sin test (21)

- **US-01:** c3 (reglas de contraseña en el registro) y c7 (la contraseña no se devuelve).
- **US-02:** c4, c5, c6 (bloqueo por intentos fallidos, reinicio y levantamiento a los 15 min) y c7 (userId en el token).
- **US-04:** c2 (los archivados no aparecen).
- **US-06:** c6 (el que cambia el estado debe ser miembro vigente).
- **US-08:** c1, c2, c4, c5 (longitud del comentario, validación en la API, orden ascendente, 403 a no miembros).
- **US-10:** c2 (eliminación física).
- **US-11:** c5, c6, c7 (el miembro quitado deja de ver el proyecto, sus tareas quedan sin asignar y no puede operar).
- **US-13:** c2 (cascada de comentarios, historial y etiquetas al borrar una tarea).
- **US-15:** c2, c5, c6, c7 (caso de mayúsculas, máximo de 10, quitar una que no existe, 403 a no miembros).

Seis de los 21 se concentran en dos funciones enteras sin test: el bloqueo de cuentas (US-02 c4 a c6) y la quita de miembros (US-11 c5 a c7).

Dos aclaraciones sobre la contabilidad:

- US-01 c3 figura como hueco aunque el issue #8 cita ese criterio: el test que lo reproduce (`password-reset` › c7) ejercita `/auth/reset-password`, no `/auth/register`. Si el registro tiene el mismo bug, hoy nada lo detecta.
- Hay criterios con test parcial, marcados `(parcial)` en el detalle. Cuentan como cubiertos, pero conviene completarlos: el máximo de 500 caracteres de la descripción al crear (US-03 c2), el 400 de la API al quitar al owner (US-11 c4), el autor y timestamp en la API (US-08 c3), el 403 al borrar el comentario ajeno (US-08 c6), el máximo de 30 de la etiqueta (US-15 c4) y la expiración de 24 h del JWT (US-02 c1).

### Criterios cubiertos solo por tests de caracterización

US-01 c2, US-07 c2, US-07 c5, US-11 c3 y US-12 c3 dependen únicamente de `characterization.test.ts`. Pasan, pero fueron escritos para fijar el comportamiento actual y no para validar el criterio: si el comportamiento cambia a propósito, hay que revisarlos como tests de criterio.

### Tests sin criterio claro

Categoría aparte, no cuentan como hueco:

- **`characterization.test.ts` (40 tests, todos verdes):** fijan el comportamiento existente antes de refactorizar. Los 6 de "Cambios de comportamiento detectados" documentan diferencias respecto de la versión anterior (fallan en `f0d3453`), y uno de ellos fija que un `search` con `' OR '1'='1` se trata como texto, lo que toca el no funcional de seguridad 1.
- **Casos de borde de US-06 sin número de criterio:** `tasks-lifecycle` › TODO → TODO responde 200 y › un status fuera del enum da 400 y no 422. La especificación no dice nada de ninguno de los dos.
- **Prioridad por defecto:** `tasks-lifecycle` › usa MEDIUM cuando no se envía priority. La especificación no define un valor por defecto.
- **Convenciones generales (401 y 404):** los tests de `tasks-lifecycle` › 401 sin token, token inválido y proyecto inexistente prueban las convenciones de autenticación y errores, no un criterio de historia.
- **Flujos felices de US-15 sin criterio numerado:** `task-edit` › agregar una etiqueta la muestra como chip y › quitar una etiqueta la saca de la lista.
- **E2E de navegación y bordes:** el link de volver al tablero, el link de miembros, las tarjetas que navegan al tablero y a miembros, "cada tarjeta expone su propio estado", "un usuario ajeno al proyecto no se ofrece como opción" (US-14), "si la API falla la tarea sigue en pantalla" (US-13) y el contador de comentarios de la tarjeta.
- **Accesibilidad (6 tests, `a11y.spec`):** responden a la auditoría de la Clase 12 (`docs/clase12-m2-reporte.md`), no a un criterio de la especificación.
- **Contract tests de Pact (4 tests):** cubren el contrato de lista de proyectos, login y comentarios entre `client` y `server`; no están en los resultados de esta matriz.

### Requerimientos no funcionales

Fuera de esta matriz por criterio de historia. Hoy tienen test: paginación (`listing-pagination`, rojo por #12) y el rendimiento con 5.000 tareas (`performance/REPORTE.md`, k6). En la suite de la API no hay tests de concurrencia ni de la mayoría de los de seguridad.
