# aVioa Traslados

Módulo privado para registrar y gestionar solicitudes de traslados. Interfaz React con TypeScript, rutas de servidor compatibles con App Router y persistencia D1 mediante Drizzle. El despliegue de Sites usa Vinext y Cloudflare Workers; no requiere instalar NestJS ni PostgreSQL para probarlo.

## Funcionalidad

- Formulario por pasos con reserva iTraffic, titular, teléfono, asesor, destino, hotel, pasajeros e infantes, llegada, regreso, tours y observaciones.
- Bandeja con búsqueda, filtros, paginación y exportación CSV de los resultados filtrados.
- Edición, estados Pendiente / En gestión / Confirmado / Cancelado e historial persistente.
- Contactos editables para Cartagena, Santa Marta, San Andrés, Palomino y Barú, según el flujo aportado.
- Mensaje de proveedor para copiar y descarga del JSON del formulario anterior.
- Prevención de reservas duplicadas por cuenta y control de edición concurrente con version.

La base inicia sin solicitudes. Los proveedores iniciales son configuración, no registros de viajes ficticios. Cambiar un estado no significa que se haya enviado una comunicación. El envío de correo por Gmail requiere configurar OAuth y autorizar la cuenta. Evolution API incorpora envío manual de WhatsApp; n8n permanece independiente. No se incorporan credenciales del archivo original.

## Acceso

El sitio empieza privado para el propietario. Las páginas requieren identidad de ChatGPT y cada endpoint comprueba la identidad en servidor. Solicitudes, proveedores personalizados e historial se filtran por el identificador autenticado de la cuenta. No se acepta ownerId en el cuerpo. Compartir el sitio no crea automáticamente una bandeja compartida; el ámbito de equipo se definirá al integrarlo con Avioa. La validación del origen añade una protección para escrituras desde el navegador.

## Estructura

- components/transfers/TransfersApp.tsx: interfaz, formulario, proveedores y detalle.
- lib/transfers/domain.ts: validación Zod, tipos, catálogos, mensaje y mapeo para n8n.
- lib/transfers/client.ts: único adaptador HTTP de la interfaz.
- lib/transfers/repository.ts: persistencia y aislamiento de datos en servidor.
- lib/transfers/http.ts: autorización y respuestas de API.
- app/api/transfers y app/api/providers: controladores de servidor.
- db/schema.ts y drizzle/: esquema y migraciones D1.
- docs/INTEGRACION_AVIOA.md: contrato y pasos de incorporación al portal.
- tests/transfers.mjs: pruebas con SQLite en memoria y rutas compiladas.
- .openai/hosting.json: identidad de Sites y binding DB.

## Desarrollo y validación

Requiere Node >=22.13, pnpm y soporte de node:sqlite (Node 24 recomendado para las pruebas).

    pnpm install --frozen-lockfile
    pnpm dev
    pnpm build
    node node_modules/typescript/bin/tsc --noEmit
    node tests/transfers.mjs

Para la vista local, aplica las migraciones con Wrangler al binding DB y una base local. El servidor de desarrollo y la base alojada son independientes. Sites aplica las migraciones alojadas al publicar. No se crea el esquema durante una solicitud HTTP. No subir .wrangler, .sites-runtime, archivos de entorno o dist como sustituto del código fuente.

Los horarios de vuelo son horas locales del destino y se guardan como fecha y hora separadas. Las marcas de creación e historial se guardan en UTC y se muestran en America/Bogota. No se bloquean fechas pasadas, para permitir registrar solicitudes históricas. La reserva iTraffic es única por cuenta: solicitudes adicionales para la misma reserva se deben gestionar editando el registro; revisar esta regla si una reserva requiere varios hoteles o trayectos independientes.

## Correo por Gmail API

La versión 0.2.0 incorpora OAuth de Google por cuenta, permiso gmail.send y datos básicos de identidad. No solicita lectura del buzón. Los tokens de actualización se cifran con AES-GCM y se vinculan al propietario; no se exponen por API ni se guardan en GitHub. Gmail API envía desde la cuenta autorizada y el correo aparece en Enviados.

Configura GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET como secretos en Sites. La clave GMAIL_TOKEN_ENCRYPTION_KEY y GMAIL_REDIRECT_URI también deben existir en el entorno. Después autoriza desde Conexiones. Pasos completos en docs/GMAIL.md. No es necesario suministrar manualmente un refresh token.

Desde una solicitud, Mensaje al proveedor permite revisar remitente, destinatarios y contenido, y confirmar el envío real. Cada versión tiene un registro único de envío; un doble clic o una petición concurrente no vuelve a enviarla. Los fallos de autorización y rechazos 4xx permiten reintento explícito. Una interrupción, error 5xx o resultado incierto bloquea el reenvío: primero se debe comprobar Enviados. No hay reintentos automáticos ni colas en esta versión.

    node tests/gmail.mjs

Las pruebas simulan Google y no envían correos. La integración real requiere configurar la aplicación OAuth, autorizar el buzón y realizar una prueba explícita.

## WhatsApp por Evolution API

Desde la versión 0.3.0, Conexiones comprueba la instancia y las solicitudes con proveedor WhatsApp permiten revisar y confirmar el envío. Los contactos se obtienen en servidor, sin enviar claves al navegador. Hay historial, protección de duplicados por versión, reintento explícito de rechazos y bloqueo de resultados inciertos. Aceptado por Evolution no equivale a entregado o leído. Ver docs/EVOLUTION.md.

    node tests/evolution.mjs
