# Desarrollo de aVioa Traslados

Este Site debe mantener su código versionado en https://github.com/Alejandro-aVioa/avioa-traslados.

Antes de editar, comprobar la última versión de main en GitHub y comparar con el checkout. Incorporar cambios remotos sin sobrescribir trabajo ajeno. También abrir la fuente actual de Sites con su workflow antes de modificarla. Los commits de ambas plataformas pueden tener SHA distintos; comparar contenido y registrar la correspondencia.

Cada cambio solicitado debe subirse a GitHub y publicarse en Sites salvo que el usuario pida explícitamente no desplegar. Verificar ambos resultados. No afirmar que publicar en Sites sincroniza por sí mismo GitHub. Las versiones de código no contienen los datos de producción.

Conservar migraciones aplicadas; agregar nuevas migraciones para cambios del esquema. No subir credenciales, tokens, bases locales, dist ni archivos de estado. No ejecutar envíos reales como pruebas sin autorización explícita del destinatario y contenido. Los tests de Gmail usan servicios simulados.

Comprobaciones para cambios funcionales: node tests/transfers.mjs, node tests/gmail.mjs, node node_modules/typescript/bin/tsc --noEmit y el build mediante la habilidad de Sites. Mantener separadas la interfaz, los servicios de datos, el dominio y los adaptadores para facilitar la integración en Avioa.
