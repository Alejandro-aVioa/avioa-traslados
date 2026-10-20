# Conectar Gmail API

## Configuración de Google Cloud

1. Elegir un proyecto de Google Cloud y activar Gmail API.
2. Configurar el consentimiento OAuth con el nombre de la aplicación y sus datos de contacto. Elegir audiencia interna si Google Workspace y el proyecto lo permiten, o externa según el caso. En modo de prueba, agregar la cuenta remitente como usuario de prueba. Revisar las restricciones de Google sobre aplicaciones externas de prueba y la eventual verificación antes de usarlo de forma continua.
3. Crear un cliente OAuth de tipo Aplicación web. Se puede revisar si el proyecto de n8n sirve, pero conviene crear un cliente separado para este módulo para evitar que las autorizaciones de otras herramientas se vean afectadas.
4. Registrar exactamente esta URI de redirección autorizada:

   https://avioa-traslados.avioa-8387.chatgpt.site/api/gmail/callback

5. Si se cambia el dominio del sitio, registrar la nueva URI y actualizar GMAIL_REDIRECT_URI antes de autorizar. Para requisitos de marca o verificación de dominio impuestos por Google, usar un dominio de la organización y seguir su procedimiento de verificación.

## Secretos del servidor

En la configuración de variables del sitio, establecer como secretos:

- GMAIL_CLIENT_ID: identificador del cliente OAuth de aplicación web.
- GMAIL_CLIENT_SECRET: secreto del mismo cliente OAuth.
- GMAIL_TOKEN_ENCRYPTION_KEY: clave aleatoria de 32 bytes codificada como base64url, ya creada para esta instalación. No reemplazarla mientras existan conexiones cifradas sin un procedimiento de migración.
- GMAIL_REDIRECT_URI: URI exacta registrada arriba, ya configurada para esta instalación.

No introducir secretos en el código, archivos versionados ni campos del formulario de solicitudes. Al cambiar variables de Sites, desplegar una versión guardada para aplicar la revisión nueva del entorno.

## Autorizar la cuenta

En el sitio abrir Conexiones y elegir Conectar con Google. Elegir el buzón remitente y autorizar gmail.send, openid y email. El permiso Gmail es exclusivamente de envío; openid y email identifican el correo remitente. Google devuelve un código que el servidor canjea por tokens. El estado de un solo uso, la cookie HttpOnly y PKCE vinculan la respuesta al inicio de autorización. El refresh token se cifra antes de persistir en D1 y nunca se devuelve al navegador. Los access tokens solo se mantienen en memoria durante la operación.

Conectar no envía ningún correo. Una autorización revocada requiere reconexión. El botón Desconectar elimina el token local y los estados OAuth pendientes de esa cuenta. No revoca permisos del proyecto entero en Google; el usuario puede revisar autorizaciones en su cuenta de Google por separado.

## Enviar una solicitud

Abrir una solicitud con proveedor de correo, entrar a Mensaje al proveedor y revisar el remitente, los destinatarios y el asunto. Elegir Revisar y enviar correo. La confirmación muestra el cuerpo completo y exige una pulsación adicional para el envío real. Gmail API crea el envío desde la cuenta autorizada y se puede consultar en Enviados. No se asegura entrega al buzón del destinatario ni lectura por el proveedor.

Los destinatarios se toman de la configuración del proveedor en el servidor, no del cuerpo del POST. El hash de la vista previa incluye versión, remitente, destinatarios, asunto y contenido. Si cambia alguno, se exige una nueva revisión. Las solicitudes canceladas y los destinos WhatsApp no se pueden enviar por esta ruta.

## Registro de resultados

email_deliveries guarda remitente, destinatarios, versión, identificador devuelto por Gmail, estado e intentos. No guarda tokens. Un índice único impide envíos concurrentes o repetidos para la misma versión. El éxito añade un evento al historial, pero no cambia automáticamente el estado operativo a Confirmado.

- sent: Gmail devolvió un identificador; se bloquea un segundo envío de esa versión.
- failed: fallo previo al envío o rechazo 4xx. Se permite reintentar de forma explícita después de revisar.
- uncertain: fallo de red, servidor 5xx o respuesta sin identificador. No se reintenta automáticamente.
- sending: la operación está en curso; si el proceso se interrumpió, puede quedar pendiente de reconciliación manual.

Un resultado incierto debe comprobarse en Enviados antes de cualquier reenvío. El módulo solicita solo gmail.send y no puede buscar en el buzón para reconciliarlo automáticamente. Editar una solicitud genera otra versión y puede habilitar un envío distinto: se requiere revisar si la versión anterior ya se envió para evitar repetir la coordinación. Las pruebas cubren autorización, cifrado, concurrencia, contenido UTF-8, destinatarios, aislamiento por cuenta y reintentos. Todas las llamadas a Google en pruebas son simuladas.

## Endpoints

GET /api/gmail/connection devuelve estado de configuración y correo conectado, sin credenciales. GET /api/gmail/connect inicia OAuth. GET /api/gmail/callback procesa el retorno. DELETE /api/gmail/connection desconecta la cuenta localmente. GET /api/transfers/:id/email prepara la vista previa y el historial. POST en esa misma ruta recibe version, previewHash y retry y envía el mensaje ya revisado.

## Referencias

https://developers.google.com/identity/protocols/oauth2/web-server
https://developers.google.com/workspace/gmail/api/guides/sending
https://developers.google.com/workspace/gmail/api/auth/scopes

## Prueba operativa autorizada

POST /api/gmail/test permite una prueba de diagnóstico de un solo uso y está deshabilitado por defecto. Requiere el acceso de servicio de la plataforma al Site privado y una autorización adicional de servidor GMAIL_TEST_APPROVAL. Esa autorización fija propietario, cuenta remitente, destinatario, asunto, texto, UUID e intervalo máximo de 15 minutos y almacena solo el hash del token adicional que debe presentar el llamador. El endpoint no acepta un cuerpo para evitar cambios en el destinatario o mensaje. El token de servicio y la autorización nunca se guardan en GitHub.

La autorización debe configurarse exclusivamente después de que el propietario indique el destinatario y contenido de la prueba. gmail_test_deliveries registra el resultado y evita repetir la operación con el mismo UUID, incluso ante solicitudes simultáneas. Los resultados inciertos requieren comprobar Enviados antes de otra prueba; no se reintentan. Al terminar se retira GMAIL_TEST_APPROVAL y se vuelve a desplegar para deshabilitar el diagnóstico. Este mecanismo no reemplaza el envío de solicitudes por la interfaz autenticada.
