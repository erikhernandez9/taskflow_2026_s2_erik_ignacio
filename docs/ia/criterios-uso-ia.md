# Criterios de uso de IA del equipo

Reglas que sigue el equipo (Erik Hernández e Ignacio Tachini) cuando usa IA en
TaskFlow. Salen de la Clase 12 (Etapa 2) y de lo que vimos en el Ejercicio 2
(`docs/ia/ejercicio-2-us16.md`).

## Nivel de integración

Estamos en el **nivel 2, contexto compartido**: la spec, las convenciones y los
prompts que funcionan viven versionados en el repo (`docs/ia/`). No hay IA dentro
del pipeline ni agentes con permisos para mergear.

## Dónde la usamos y qué verifica una persona

| Etapa | La IA puede… | La persona verifica… |
|---|---|---|
| Requisitos | proponer criterios y escenarios Gherkin | que no invente reglas que la spec no tiene |
| Código | asistir, completar y acompañar el TDD | que compile, pase los tests y respete la spec |
| Testing | proponer casos, datos y reportes de bug | que cada test pruebe algo real (no un `toBeDefined()` vacío) y que no use endpoints alucinados |
| CI/CD | explicar un log en rojo | que la causa sea la correcta, contra la línea del log |
| Reporte | redactar informes | cada cifra contra el pipeline, lcov o los issues |

## Definition of Done con IA

- [ ] La salida de IA está **revisada por una persona y marcada en el PR**
      (por ejemplo: "tests generados con IA, revisados y clasificados").
- [ ] Cada test generado se corrió y se clasificó: verde y correcto, verde pero no
      prueba nada, rojo por bug real, rojo por test mal escrito o alucinado.
- [ ] Los tests "verdes que no prueban nada" y los alucinados no entran a la suite.
- [ ] Un test rojo contra la spec no se borra ni se ablanda para que pase: se
      reporta como bug.
- [ ] La IA nunca es el único control: el pipeline y la revisión humana siguen siendo obligatorios.

## Qué nunca se pega en una herramienta de IA

- Credenciales, tokens y archivos `.env` (por ejemplo `server/.env` o un `JWT_SECRET`).
- Datos de usuarios reales.
- Código propietario de nuestros trabajos.

Se puede pegar: la especificación del curso, código de este repo (es del curso) y
stack traces sin datos sensibles. Antes de usar una herramienta nueva, revisamos
sus términos de uso.

## Registro de prompts

Los prompts que dieron buen resultado se guardan en `docs/ia/` con la fecha y
la herramienta usada, para que el otro integrante los reutilice:

- `prompt-us16-v1.md`: casos de prueba de una historia a partir de sus criterios.
- `prompt-us16-v2-revision.md`: revisión encadenada de esos tests contra los criterios.

Técnicas que adoptamos: prompt estructurado de seis componentes, encadenar
prompts (primero generar y después revisar contra los criterios) y dar un test
nuestro como ejemplo (few-shot) para que imite el estilo.
