# WhatsApp con Evolution API

## Configuración y estado

La integración usa HTTPS y tres variables de servidor: EVOLUTION_BASE_URL, EVOLUTION_INSTANCE y EVOLUTION_API_KEY. Se configuran como secretos de Sites y nunca se devuelven al navegador ni se guardan en GitHub. El servidor configurado para esta instalación es evolution.avioa.cloud y la instancia es Notificaciones_traslados_reserva.

La sección Conexiones muestra el estado real mediante GET /instance/connectionState/:instance y permite volver a consultarlo. open se interpreta como conectado; connecting, close y estados desconocidos no habilitan un envío. La comprobación es de lectura y no crea instancias, genera QR, reinicia ni cierra la sesión. Los errores de clave o conexión se muestran sin exponer respuestas del proveedor que pudieran contener credenciales.

## Envío de una solicitud

1. Registrar una solicitud y comprobar el proveedor del destino. Por defecto Palomino usa WhatsApp; los otros cuatro destinos usan correo. El canal y el contacto se pueden editar en Proveedores.
2. Abrir Mensaje al proveedor y comprobar la instancia, el número internacional y el contenido.
3. Elegir Revisar y enviar WhatsApp y confirmar el envío real. Guardar solicitudes o cambiar estados no envía mensajes.

El número se obtiene de la configuración del proveedor en servidor. Se admiten números individuales de 10 a 15 dígitos, con indicativo internacional; se elimina un + inicial. No se admiten grupos, JID ni destinatarios arbitrarios en el cuerpo de la solicitud de envío. El endpoint utilizado es POST /message/sendText/:instance con el header apikey y el JSON {number, text}, conforme al nodo aportado por el propietario.

Antes de enviar, se comprueban la sesión, el propietario del registro, el canal, la versión, el hash de la vista previa, el estado operativo y la conexión de la instancia. La vista previa incluye número, texto, instancia y servidor; un cambio exige una nueva revisión. Se vuelve a comprobar después de consultar el estado remoto.

## Historial y duplicados

whatsapp_deliveries conserva destinatario, versión, instancia, origen, intentos, identificador de mensaje y resultado. Un índice único por propietario, solicitud y versión permite reclamar un solo envío concurrente. No se guarda la API key ni el texto del mensaje en esa tabla.

accepted significa que Evolution devolvió un identificador key.id. No acredita entrega al teléfono ni lectura. Un rechazo HTTP 4xx queda failed y permite reintento explícito. Un fallo de red, HTTP 5xx o respuesta sin identificador queda uncertain y bloquea reintentos: se debe comprobar WhatsApp antes de decidir otra acción. sending puede persistir si la ejecución se interrumpió; tampoco se repite automáticamente. El resultado añade un evento al historial sin marcar la solicitud operativa como Confirmado.

La versión actual no incorpora webhooks de recibos de entrega o lectura, cola persistente ni reintentos automáticos. Editar una solicitud genera otra versión y puede habilitar un envío nuevo; revisar primero los envíos anteriores. Los cambios del proveedor no actualizan el flujo n8n original y no se debe ejecutar simultáneamente ese flujo para la misma solicitud, para evitar duplicados entre sistemas.

## Rutas del módulo

GET /api/evolution/connection devuelve configuración y estado seguro. GET /api/transfers/:id/whatsapp devuelve vista previa e historial propios. POST en la misma ruta recibe version, previewHash y retry. El cliente no puede sobrescribir el número, instancia, URL o API key.

## Pruebas e integración con Avioa

node tests/evolution.mjs prueba rutas, aislamiento, validaciones, conexión, concurrencia y reintentos con Evolution simulado. No envía mensajes reales. La comprobación de estado de producción es de solo lectura; cualquier prueba de envío real requiere destinatario y contenido explícitos del propietario.

lib/evolution/service.ts es el adaptador HTTP. lib/evolution/delivery.ts aplica el flujo y persistencia. Al integrar con NestJS, sustituir D1 por Prisma, usar los permisos y ámbitos de Avioa, trasladar las variables al entorno del backend y conservar la transacción de historial y el bloqueo de duplicados. BullMQ y recibos de entrega pueden añadirse como fases posteriores.
