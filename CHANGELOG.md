# Historial de versiones

## 0.3.0 — 20 de octubre de 2026

- Conexión de Evolution API con secretos de servidor y comprobación de estado.
- Envío manual de WhatsApp según proveedor, con vista previa y confirmación.
- Historial persistente, prevención de duplicados y tratamiento de resultados inciertos.
- Pruebas simuladas de conexión, autorización, destinatarios y concurrencia.

## 0.2.1 — 20 de octubre de 2026

- Prueba de correo separada de las reservas, con autorización temporal para un destinatario y contenido explícitos.
- Registro de resultados de prueba y prevención de ejecuciones duplicadas.
- Endpoint de diagnóstico deshabilitado cuando no existe una autorización vigente.

## 0.2.0 — 19 de octubre de 2026

- Conexión OAuth por cuenta para Gmail API con permiso de envío.
- Tokens cifrados en servidor, estado de un solo uso y PKCE.
- Revisión y confirmación del correo antes del envío real.
- Historial de envíos, prevención de duplicados y reintentos explícitos de rechazos.
- Pruebas simuladas y guía de configuración de Google.

La conexión queda pendiente de Client ID, Client Secret y autorización del remitente.

## 0.1.0 — 19 de octubre de 2026

- Registro, edición y seguimiento de solicitudes de traslados.
- Proveedores por destino, exportación CSV y JSON compatible con n8n.
- Persistencia D1, historial y aislamiento por cuenta.
