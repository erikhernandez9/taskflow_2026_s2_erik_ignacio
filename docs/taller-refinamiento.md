# Taller de refinamiento — Clase 2

Entrega del taller de refinamiento de **Testing y Calidad de Software**: una épica de TaskFlow descompuesta en user stories con criterios INVEST, criterios de aceptación y escenarios Gherkin.

- **Integrantes:** Erik Hernández · Ignacio Tachini
- **Repo / rama:** `taskflow_2026_s2_erik_ignacio` · `agregar-ci`
- **Fuente de verdad:** `taskflow_especificacion_requerimientos.docx` (US-09, US-10 y US-11) y el código de `server/src/modules/projects/`.

---

## 1. Épica elegida

**Épica A · Proyectos**
> "Como owner, quiero editar, eliminar y controlar quién forma parte de mi proyecto."

### Por qué la elegimos

- Es la épica que ya tiene reglas de negocio más claras y verificables: permisos de owner, unicidad de nombre, borrado en cascada y membresía.
- La mayoría de los bugs que reportamos están en esta zona (`docs/issues/05` y `09`), así que refinarla nos obliga a dejar por escrito qué es "correcto".
- La spec original junta todo en tres historias grandes (US-09, US-10, US-11). US-11 mezcla agregar, quitar y consecuencias de la baja (5 puntos): para el taller la partimos para que cada pieza entre en un sprint corto.

### Cómo la partimos

| # | Historia | Qué cubre | US de la spec |
|---|----------|-----------|---------------|
| H1 | Editar proyecto | Cambiar nombre y descripción; validaciones y permisos | US-09 |
| H2 | Eliminar proyecto | Borrado físico en cascada; permisos | US-10 |
| H3 | Agregar miembro por email | Alta de miembros; errores 403/404/409 | US-11 (c1-c3) |
| H4 | Quitar miembro | Baja de miembros; el owner no se puede quitar; tareas liberadas | US-11 (c1, c4, c6) |
| H5 | Perder acceso al ser quitado | El ex-miembro deja de ver el proyecto y de operar sobre sus tareas | US-11 (c5, c7) |

Las cinco son independientes de forma práctica: H3 es la única que alimenta a H4 y H5 con datos de prueba, pero cada una se puede implementar, desplegar y probar sola (el seed ya trae usuarios y proyectos).

---

## 2. Historias

### H1 · Editar proyecto

**Como** owner del proyecto
**quiero** editar el nombre y la descripción de mi proyecto
**para** mantenerlo actualizado cuando cambia el contexto de trabajo.

**Prioridad:** Media · **Story points:** 2

| Letra | Criterio | Justificación |
|-------|----------|---------------|
| **I** | Independiente | Solo necesita que exista un proyecto; no depende de miembros ni tareas. |
| **N** | Negociable | El alcance (¿solo nombre? ¿también descripción?) se puede ajustar con el cliente sin romper la historia. |
| **V** | Valiosa | Evita crear un proyecto nuevo cada vez que cambia un nombre. |
| **E** | Estimable | Un endpoint `PATCH` con validaciones ya conocidas de la creación: 2 puntos. |
| **S** | Chica | Entra en una sola tarde de trabajo; un endpoint y un formulario. |
| **T** | Testable | Cada criterio tiene un código HTTP y un estado observable. |

**Criterios de aceptación**

1. Solo el owner puede editar; un miembro no owner recibe **HTTP 403** y el proyecto no cambia.
2. El nombre es obligatorio si se envía y tiene entre 3 y 100 caracteres; la descripción es opcional, máximo 500 (**HTTP 400** si no cumple).
3. Al renombrar se revalida la unicidad entre los proyectos del mismo owner (**HTTP 409**).
4. Se puede enviar un solo campo: el otro conserva su valor, y la respuesta es **HTTP 200** con el proyecto completo actualizado.

```gherkin
Feature: Editar proyecto

  Scenario: El owner renombra su proyecto
    Given que soy owner del proyecto "proj-1" con nombre "Proyecto Viejo"
    When envío PATCH /projects/proj-1 con nombre "Proyecto Nuevo"
    Then la respuesta tiene status 200
    And el proyecto "proj-1" pasa a llamarse "Proyecto Nuevo"

  Scenario: No se puede renombrar a un nombre que ya uso
    Given que soy owner de los proyectos "Alfa" y "Beta"
    When envío PATCH sobre "Beta" con nombre "Alfa"
    Then la respuesta tiene status 409

  Scenario: Un miembro no owner no puede editar
    Given que soy miembro del proyecto "proj-1" pero no su owner
    When envío PATCH /projects/proj-1 con nombre "Otro nombre"
    Then la respuesta tiene status 403
```

---

### H2 · Eliminar proyecto

**Como** owner del proyecto
**quiero** eliminar un proyecto que ya no se usa
**para** mantener mi lista de proyectos limpia y relevante.

**Prioridad:** Media · **Story points:** 3

| Letra | Criterio | Justificación |
|-------|----------|---------------|
| **I** | Independiente | No requiere que existan miembros nuevos ni cambios en otras historias. |
| **N** | Negociable | Borrado físico vs. archivado es discutible; la spec decide físico, y el costo del cambio está claro. |
| **V** | Valiosa | Saca de la lista proyectos muertos y no deja datos de más. |
| **E** | Estimable | Un `DELETE` más la cascada hacia tareas, comentarios, historial y etiquetas: 3 puntos. |
| **S** | Chica | Un endpoint y una confirmación en pantalla; lo más grande es la cascada. |
| **T** | Testable | Se verifica con el código 204 y contando registros en la base. |

**Criterios de aceptación**

1. Solo el owner puede eliminar; un miembro no owner recibe **HTTP 403** y el proyecto sigue existiendo.
2. La eliminación es física y definitiva; responde **HTTP 204** sin cuerpo y el proyecto ya no aparece en `GET /projects`.
3. Se eliminan también todas las tareas del proyecto.
4. No queda ningún comentario, historial de estados ni etiqueta asociada a esas tareas (0 registros huérfanos). Un proyecto inexistente devuelve **HTTP 404**.

```gherkin
Feature: Eliminar proyecto

  Scenario: El owner elimina su proyecto y todo lo asociado
    Given que soy owner del proyecto "proj-1"
    And el proyecto tiene la tarea "task-1" con 2 comentarios y 1 cambio de estado
    When envío DELETE /projects/proj-1
    Then la respuesta tiene status 204
    And el proyecto "proj-1" ya no aparece en GET /projects
    And no queda ninguna tarea, comentario ni entrada de historial asociada

  Scenario: Un miembro no owner no puede eliminar
    Given que soy miembro del proyecto "proj-1" pero no su owner
    When envío DELETE /projects/proj-1
    Then la respuesta tiene status 403
```

---

### H3 · Agregar miembro por email

**Como** owner del proyecto
**quiero** agregar miembros indicando su email
**para** controlar quién colabora conmigo.

**Prioridad:** Alta · **Story points:** 3

| Letra | Criterio | Justificación |
|-------|----------|---------------|
| **I** | Independiente | Solo necesita un proyecto y un usuario registrado; no depende de editar ni borrar. |
| **N** | Negociable | Se puede discutir si se invita por email o se busca en un listado; la spec elige email. |
| **V** | Valiosa | Sin miembros no hay trabajo en equipo en el proyecto. |
| **E** | Estimable | Un `POST` con tres validaciones claras: 3 puntos. |
| **S** | Chica | Un endpoint y un campo de email en la pantalla de miembros. |
| **T** | Testable | Cada error tiene un código HTTP propio. |

**Criterios de aceptación**

1. Solo el owner puede agregar; cualquier otro usuario recibe **HTTP 403**.
2. Se agrega indicando el email de un usuario registrado y responde **HTTP 201** con el rol `MEMBER`.
3. Si no existe un usuario con ese email, **HTTP 404**.
4. Si el usuario ya es miembro, **HTTP 409**.

```gherkin
Feature: Agregar miembro a un proyecto

  Scenario: El owner agrega un miembro por email
    Given que soy owner del proyecto "proj-1"
    And existe un usuario con email "bob@test.com"
    When envío POST /projects/proj-1/members con email "bob@test.com"
    Then la respuesta tiene status 201
    And "bob@test.com" ve el proyecto "proj-1" en GET /projects

  Scenario: No se puede agregar dos veces al mismo usuario
    Given que "bob@test.com" ya es miembro del proyecto "proj-1"
    When envío POST /projects/proj-1/members con email "bob@test.com"
    Then la respuesta tiene status 409
```

---

### H4 · Quitar miembro

**Como** owner del proyecto
**quiero** quitar a un miembro
**para** sacar del equipo a quien ya no debe colaborar.

**Prioridad:** Alta · **Story points:** 3

| Letra | Criterio | Justificación |
|-------|----------|---------------|
| **I** | Independiente | Para los tests alcanza con un miembro creado por el seed. |
| **N** | Negociable | Qué pasa con las tareas del ex-miembro (liberarlas o reasignarlas) es negociable; la spec elige liberarlas. |
| **V** | Valiosa | Permite corregir la composición del equipo. |
| **E** | Estimable | Un `DELETE` más la liberación de tareas: 3 puntos. |
| **S** | Chica | Un endpoint y un botón en la fila del miembro. |
| **T** | Testable | Se verifica con 204, 400 y el estado de la tarea. |

**Criterios de aceptación**

1. Solo el owner puede quitar miembros; cualquier otro usuario recibe **HTTP 403**.
2. Quitar a un miembro responde **HTTP 204** y desaparece de la lista de miembros.
3. El owner no puede quitarse a sí mismo (**HTTP 400**).
4. Las tareas que el miembro tenía asignadas quedan sin asignado.

```gherkin
Feature: Quitar miembro de un proyecto

  Scenario: Quitar un miembro libera sus tareas asignadas
    Given que "bob@test.com" es miembro de "proj-1" y tiene asignada la tarea "task-1"
    When envío DELETE /projects/proj-1/members/user-2
    Then la respuesta tiene status 204
    And la tarea "task-1" queda sin asignado

  Scenario: El owner no puede quitarse a sí mismo
    Given que soy owner del proyecto "proj-1"
    When envío DELETE /projects/proj-1/members con mi propio id
    Then la respuesta tiene status 400
```

---

### H5 · Perder el acceso al ser quitado

**Como** owner del proyecto
**quiero** que quien quité deje de ver el proyecto y de operar sobre sus tareas
**para** estar seguro de que la baja es efectiva.

**Prioridad:** Alta · **Story points:** 2

| Letra | Criterio | Justificación |
|-------|----------|---------------|
| **I** | Independiente | Es una verificación de acceso: solo necesita que exista una baja previa. |
| **N** | Negociable | Se puede discutir si el ex-miembro recibe 403 o 404; la spec fija 403 para tareas. |
| **V** | Valiosa | Sin esto, quitar a alguien no protege la información del proyecto. |
| **E** | Estimable | Reutiliza la validación de membresía que ya existe en tareas: 2 puntos. |
| **S** | Chica | Son chequeos sobre endpoints existentes. |
| **T** | Testable | Se prueba con el usuario quitado y dos requests. |

**Criterios de aceptación**

1. Después de la baja, el proyecto deja de aparecer en el `GET /projects` del ex-miembro.
2. El ex-miembro no puede leer ni modificar tareas del proyecto (**HTTP 403**).
3. Esto vale aunque la tarea siguiera figurando a su nombre antes de la baja.
4. El resto de los miembros y sus tareas no se ven afectados.

```gherkin
Feature: Acceso de un ex-miembro

  Scenario: Un ex-miembro no puede operar sobre las tareas del proyecto
    Given que "bob@test.com" fue quitado del proyecto "proj-1"
    When "bob@test.com" envía PATCH /tasks/task-1 con status "IN_PROGRESS"
    Then la respuesta tiene status 403

  Scenario: El proyecto desaparece de la lista del ex-miembro
    Given que "bob@test.com" fue quitado del proyecto "proj-1"
    When "bob@test.com" envía GET /projects
    Then la respuesta no incluye "proj-1"
```

---

## 3. Trazabilidad con la spec y los tests

| Historia | US de la spec | Tests que la cubren | Estado |
|----------|---------------|---------------------|--------|
| H1 | US-09 | `server/tests/projects-edit-delete.test.ts` (c1, c4, c5, c6, c7); `server/tests/projects-name-validation.test.ts` | Cubierta en API. Sin E2E de edición. |
| H2 | US-10 | `server/tests/projects-edit-delete.test.ts` (c1, c3, c4/c5, c6, c7) | Cubierta en API; c4/c5 reproduce el bug de `docs/issues/09-eliminar-proyecto-deja-huerfanos.md`. |
| H3 | US-11 | `e2e/specs/members.spec.ts` (agregar miembro) | Solo E2E; faltan tests de API para 403, 404 y 409. |
| H4 | US-11 | `e2e/specs/members.spec.ts` (owner no se quita; quitar miembro) | Solo E2E; falta test de API para la liberación de tareas. |
| H5 | US-11 | `e2e/specs/members.spec.ts` (miembro no owner en solo lectura) cubre solo la vista | Sin cobertura del 403 en tareas de un ex-miembro. |

Los tests de proyectos en `e2e/specs/projects.spec.ts` cubren US-03 y US-04 (crear y listar), no esta épica.

### Inconsistencias entre la spec y el código

- **H1:** `POST /projects` no valida el mínimo de 3 caracteres del nombre (solo el máximo), mientras que `PATCH` sí. Es el issue `docs/issues/05-proyecto-nombre-corto.md`.
- **H2:** no hay borrado en cascada de comentarios e historial al eliminar un proyecto (`docs/issues/09`).
- **H4:** `removeMember` solo borra la membresía; no pone `assigneeId = null` en las tareas del ex-miembro, como pide US-11 c6.
- **H1/H2:** un usuario que ni es miembro recibe 404, y un miembro no owner recibe 403. La spec dice 404 para "inexistente o ajeno", así que es consistente, pero conviene dejarlo escrito.
- **H3/H4:** en cambio, para agregar o quitar miembros cualquier no-owner recibe 403, aunque el proyecto no sea suyo (la spec lo pide así, pero filtra que el proyecto existe).
