# Prompt 2 (Ejercicio 2b) — revisión encadenada de los tests de US-16

Segundo paso de la cadena: a la IA se le pasan los tests que generó con el
prompt 1 (`prompt-us16-v1.md`) y los criterios, y se le pide que los revise.
Se usó la misma herramienta, en una conversación nueva.

---

**Rol.** Sos un ingeniero de QA que revisa tests de API escritos por otra persona.

**Contexto.** Los tests de abajo son de TaskFlow (Express + Jest + Supertest) y
cubren la historia US-16. Cada archivo de test de Jest corre en un entorno
aislado: las variables de `process.env` que se cambian adentro del test no
afectan al proceso de Node que ejecuta la API.

**Instrucción.** Revisá estos tests contra los criterios de aceptación y marcá
lo que falta: criterios o casos borde sin cubrir, tests que pasarían aunque la
API no cumpla el criterio (no prueban nada) y tests que asumen algo que la spec
no dice. Después proponé los tests nuevos que harían falta.

**Datos de entrada.**

1. Los criterios de US-16 (los mismos ocho del prompt 1, más la convención de
   fechas de la spec).
2. El archivo `server/tests/us16-due-date-ia.test.ts` que generaste antes, completo.

**Restricciones.** Usá solo los endpoints y helpers que ya aparecen en el archivo.
No inventes criterios. No reescribas los tests que ya están bien.

**Formato de salida.** Primero una lista corta de hallazgos (uno por línea, con
el criterio y el nombre del test afectado). Después, en un bloque de código, solo
los `it()` nuevos para agregar al final del `describe` principal.
