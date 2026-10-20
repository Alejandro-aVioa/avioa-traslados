# Integración de Traslados en Avioa

## Objetivo

Reutilizar la interfaz y el contrato del prototipo dentro del frontend Next.js existente, con reglas, permisos y datos definitivos en NestJS y PostgreSQL. El registro de traslados reemplaza al piloto de memristores. No requiere microfrontends, iframe o autenticación compartida con Sites.

## Contrato de API del prototipo

Todas las respuestas de datos usan {data: ...}. Errores con {message: string}; validación añade errors. Fechas de viaje YYYY-MM-DD, horas HH:mm locales del destino; auditoría ISO UTC. Sin credenciales en el navegador.

| Método | Ruta | Solicitud | Respuesta |
| --- | --- | --- | --- |
| GET | /api/transfers | Sin cuerpo | {data: Transfer[]} |
| POST | /api/transfers | TransferInput | 201 {data: Transfer} |
| GET | /api/transfers/:id | Sin cuerpo | {data: Transfer, events: TransferEvent[]} |
| PATCH | /api/transfers/:id | {version, input: TransferInput, status} | {data: Transfer} |
| GET | /api/providers | Sin cuerpo | {data: Provider[]} |
| PUT | /api/providers | Provider | {data: Provider} |

Errores: 401 sin sesión; 403 origen no permitido; 404 recurso inexistente o fuera del ámbito; 409 reserva duplicada o versión desactualizada; 422 validación; 500 fallo interno. La propiedad de cada fila se obtiene en servidor. La edición completa exige la versión que se leyó para evitar sobrescrituras. El prototipo carga el listado completo por cuenta y filtra/pagina en cliente; para mayor volumen, añadir paginación y filtros de servidor conservando el servicio como punto de adaptación.

TransferInput está definido en lib/transfers/domain.ts. Transfer añade id, status, version, createdAt y updatedAt. Provider usa destination, name, channel (email o whatsapp) y contact. Historial usa id, action y createdAt.

## Incorporación al frontend

1. Obtener la última versión de main y revisar las convenciones actuales del repositorio avioa-frontend antes de editar. Trabajar en una rama revisable y subir los cambios a GitHub.
2. Incorporar los componentes bajo components/transfers y una página bajo app/(portal). La interfaz recibe nombre de usuario como propiedad, no importa identidad de Sites.
3. Sustituir el fetch de lib/transfers/client.ts por el Axios existente con base /api. Reutilizar sus Route Handlers para reenviar Authorization a NestJS.
4. Registrar TRANSFERS en lib/modules.ts y lib/navigation.ts y en las reglas del middleware. Si se coloca bajo /admin, actualizar también la lista de entrada administrativa y su catálogo.
5. Adaptar el CSS a los tokens Tailwind y componentes comunes del portal. El CSS del prototipo es global y no se debe copiar entero sobre globals.css del portal. Revisar compatibilidad del resolver, Zod y las versiones de componentes.
6. Opcionalmente envolver el servicio con React Query para caché e invalidación, sin acoplar el formulario al proveedor de persistencia.

## Incorporación al backend

1. Obtener la última versión de avioa-backend. Crear src/modules/transfers con controller, service y DTOs según el patrón del portal.
2. Crear modelos Prisma Transfer, TransferEvent y configuración de proveedores. El esquema D1 contiene columnas explícitas; transformar migraciones y datos a PostgreSQL, sin ejecutar SQL de SQLite directamente.
3. Añadir el módulo raíz y la clave TRANSFERS al catálogo del backend. Separar creación de solicitudes, gestión y configuración de proveedores con permisos que apruebe el equipo.
4. Reutilizar JwtAuthGuard y ModulePermissionGuard; añadir los decoradores requeridos en todas las operaciones. Revisar antes la diferencia actual sobre actions vacío entre frontend y backend. La política no debe cambiar silenciosamente para los usuarios existentes.
5. Determinar el ámbito de consulta y edición: propios, equipo o toda la operación. El ID de ChatGPT del prototipo no es el ID de usuario de Avioa y requiere un mapeo explícito al migrar.
6. Mantener actualización y evento en una transacción Prisma; aplicar condición de version y unicidad con el ámbito elegido.

## Conexión con el flujo de n8n

legacyPayload conserva las claves del formulario anterior, incluido el espacio final de "Hora de regreso ", porque el flujo adjunto lo usa. Devuelve el objeto que n8n recibe bajo body al hacer POST a su webhook. Actualmente se descarga y no se envía. La marca temporal del payload es la fecha de preparación del archivo, no la fecha de creación del registro; al automatizar, acordar el formato y la zona horaria que esperan las hojas existentes.

Hay cinco rutas por destino: Cartagena, Santa Marta, San Andrés y Barú usan correo; Palomino usa WhatsApp en el flujo aportado. Los contactos se tomaron del archivo del usuario; los nombres descriptivos deben verificarse con operaciones antes de envíos reales.

Para una siguiente fase: conectar un webhook autenticado desde servidor o trasladar la entrega a BullMQ en Avioa, usando Gmail/Evolution según el destino. Configurar secretos nuevos mediante el entorno autorizado. Usar un identificador de entrega por solicitud y versión, registrar intentos por canal y distinguir pendiente, aceptado por proveedor de API, error y confirmación operativa. Un 200 del webhook no prueba que el correo o WhatsApp haya sido entregado.

Los cambios de proveedores en este prototipo no actualizan los nodos de n8n, que tienen destinatarios fijos. Antes de automatizar, elegir una sola fuente para el enrutamiento y hacer que n8n la respete. La persistencia debe ocurrir antes del envío para que un fallo de Gmail/Evolution no pierda la solicitud. Evitar activar n8n y entrega directa simultáneamente para la misma versión.

## Migración y comprobación

Exportar los registros desde la API autenticada; el CSV también incluye todos los campos de negocio de los resultados filtrados, pero no reemplaza un respaldo completo del historial y proveedores. Implementar una exportación de migración autorizada para esos datos cuando sea necesaria. Preservar identificadores, fechas y versiones. Mapear propietarios de ChatGPT a usuarios Avioa mediante una tabla aprobada; no inferirla por el nombre del asesor.

Verificar cantidades, campos, historial y permisos. Coordinar el cambio de escritura, las solicitudes nuevas y la reversión. Definir retención de datos de pasajeros, quién puede ver teléfonos, y si el historial requiere auditoría por actor al compartir la operación. Confirmar despliegue de los nuevos repositorios: el Compose revisado sigue apuntando a la imagen de otra cuenta de GHCR.

## Fuera de esta primera versión

Envío automático, importación de Google Sheets, sincronización con n8n, base PostgreSQL de producción, permisos de equipo de Avioa y acceso público. OAuth y envío manual con Gmail API están implementados desde la versión 0.2.0; requieren configuración y autorización de la cuenta. La versión actual es funcional para registro y seguimiento privado y no requiere esas conexiones para probarse.

## Integración del correo

Los servicios de Gmail están separados en lib/gmail y sus componentes en GmailConnection y GmailSend. Al trasladarlos a NestJS, reemplazar D1 por Prisma y los secretos de Sites por los del backend. Conservar estado OAuth de un solo uso, PKCE, cifrado de refresh tokens, ámbito de propietario y unicidad del envío por versión. No reutilizar IDs de ChatGPT como usuarios Avioa. Revisar si se adoptará una cuenta compartida de reservas o una cuenta por asesor.

## Integración de WhatsApp

Desde 0.3.0, Evolution API se implementa en lib/evolution con configuración de servidor y registros en whatsapp_deliveries. La interfaz obtiene el estado real y envía únicamente después de revisión. Trasladar los servicios a NestJS y las tablas a Prisma conservando autorización y unicidad por versión. Ver docs/EVOLUTION.md para estados y limitaciones.
