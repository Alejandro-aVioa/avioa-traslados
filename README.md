# aVioa Traslados

Módulo privado para registrar y gestionar solicitudes de traslados. Interfaz React con TypeScript, rutas de servidor compatibles con App Router y persistencia D1 mediante Drizzle. El despliegue de Sites usa Vinext y Cloudflare Workers; no requiere instalar NestJS ni PostgreSQL para probarlo.

## Funcionalidad

- Formulario por pasos con reserva iTraffic, titular, teléfono, asesor, destino, hotel, pasajeros e infantes, llegada, regreso, tours y observaciones.
- Bandeja con búsqueda, filtros, paginación y exportación CSV de los resultados filtrados.
- Edición, estados Pendiente / En gestión / Confirmado / Cancelado e historial persistente.
- Contactos editables para Cartagena, Santa Marta, San Andrés, Palomino y Barú, según el flujo aportado.
- Mensaje de proveedor para copiar y descarga del JSON del formulario anterior.
- Prevención de reservas duplicadas por cuenta y control de edición concurrente con version.

La base inicia sin solicitudes. Los proveedores iniciales son configuración, no registros de viajes ficticios. Cambiar un estado no significa que se haya enviado una comunicación. Envíos automáticos de Gmail, Evolution API y n8n pendientes de conexión; el sitio no llama a esos servicios ni incorpora las credenciales del archivo original.

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
