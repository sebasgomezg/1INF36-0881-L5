# Estado de Avisa Campus

## Completado y verificado

- Configuración web real incorporada para etica-cec4a, modo producción; SDK Compat por CDN sin compilación.
- Firestore Standard (default) existente en southamerica-west1; facturación deshabilitada, Spark conservado.
- Proveedores Auth Anónimo y Correo/Contraseña habilitados.
- Dominio sebasgomezg.github.io autorizado.
- Reglas locales probadas con SDK cliente, desplegadas y comparadas con la versión remota.
- Índices de votos en estado READY y exclusiones de imágenes/textos aplicadas.
- Cuenta administrativa creada mediante operación privilegiada; contraseña aleatoria solo en .admin-credential.local, ignorado por Git.
- Flujos con Firebase real desde servidor local: dos estudiantes independientes, persistencia/recarga, fotos, votos, negativos de seguridad, login administrativo persistente, aprobación, respuesta, historial, retiro/restauración, descarte, borrador de correo manual y limpieza de los datos técnicos creados.
- Preparación de Pages desde main/docs, rutas relativas y .nojekyll.

## Publicación completada y verificada

- Commits y push a origin/main realizados; Pages activo desde main/docs.
- URL pública: https://sebasgomezg.github.io/1INF36-0881-L5/; HTTPS y respuesta 200.
- Once grupos de pruebas reales desde Pages correctos: dos estudiantes independientes, administrador, reglas, imágenes, persistencia/recarga, votos, privados, moderación, historial, retiro/restauración y logout.
- Corregida y verificada la carrera de suscripción privada al registrar reportes. No hay que reducir permisos para que funcione.
- Datos técnicos de ensayo limpiados; sin secretos administrativos versionados.

No hay bloqueos de permisos ni pasos de configuración pendientes para usar el sitio. La contraseña del administrador está únicamente en el archivo local privado .admin-credential.local.

## Limitaciones de Spark

- Correos automáticos preparados pero deshabilitados y no desplegados. No se habilitó Blaze ni Resend.
- Avisos manuales disponibles con consentimiento: preparar borrador/copiar mensaje no equivale a envío o entrega.
- Eliminar el contacto después del envío efectivo y revisar manualmente la conservación máxima de 30 días.

No faltan valores de configuración web ni habilitación de proveedores. Las credenciales administrativas no deben incorporarse al repositorio.
