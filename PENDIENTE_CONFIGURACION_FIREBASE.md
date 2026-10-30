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


## Actualización 30 de octubre: cuentas y fotografías

La navegación pública usa Iniciar sesión con popup de acceso/registro. Los estudiantes eligen un seudónimo y contraseña; Firebase Auth utiliza internamente un identificador de correo técnico @usuarios.avisa.invalid, sin solicitar un correo real. Las contraseñas se gestionan exclusivamente mediante Authentication y no se guardan en Firestore. La cuenta administrativa conserva su correo existente. No hay recuperación por correo para seudónimos sin dirección real.

Los visitantes consultan reportes; registrar y confirmar exige cuenta también en las reglas. El registro vincula la sesión anónima actual para preservar sus reportes. Mis reportes reúne publicaciones, pendientes y retirados propios, con detalle e historial. Las suscripciones actualizan tarjetas y detalles de estudiantes. No se publican usuarios en los incidentes.

Se quitaron los avisos técnicos de conexión exitosa. Se conserva la apariencia, con marco 4:3 para fotos del detalle, object-fit:contain y visor superpuesto responsive con Cerrar. Las tarjetas mantienen miniaturas cuadradas.

Pruebas de esta actualización: npm test 13/13 y reglas en emulador 9/9. Prueba real local de cuenta nueva, reporte, Mis reportes, persistencia, acceso administrativo y limpieza correcta. La comprobación con fotos y desde Pages se registra en el cierre de la sesión; los resultados históricos anteriores no validan por sí solos este nuevo flujo.

Los avisos automáticos siguen sin desplegarse por Spark; se conserva el borrador manual consentido. No se habilitan servicios de pago.
`nLa actualización de cuentas y visor está publicada y comprobada desde Pages. Los avisos automáticos siguen pendientes bajo Spark.


Actualización: se elimina el flujo de retirados/restauración. El borrado administrativo es definitivo y limpia datos asociados. Las pruebas usan cuentas técnicas y su limpieza se realiza mediante operaciones privilegiadas de Firebase, sin opción de borrar cuentas en la interfaz. El correo es manual (mailto/copiar); no hay envío automático activo.


## Cierre de limpieza de ensayos y eliminación del flujo de retirados

No existe sección ni estado de retirados en la aplicación vigente. Las reglas admiten solo visibilidad publico/revision. El borrado administrativo elimina definitivamente el reporte y sus datos asociados; no lo traslada a otro estado. Los apartados históricos de esta documentación describen versiones anteriores.

Se eliminaron los dos reportes técnicos señalados y dos cuentas de ensayo verificadas mediante Firebase Admin. La prueba nueva utilizó una cuenta técnica y se limpiaron después su reporte y su cuenta mediante operaciones privilegiadas, sin usar eliminación de cuentas desde el navegador. Consulta posterior: cero reportes de esos ensayos y cero cuentas técnicas pendientes. No se borraron cuentas reales ni se modificó la facturación.

Validación local: 13 pruebas unitarias y 9 pruebas de reglas correctas; prueba de navegador con Firebase real correcta. El correo automático sigue deshabilitado. La opción manual prepara un mailto o copia el mensaje; no equivale a envío ni entrega. No hay controles de eliminación de cuentas en el frontend. La limpieza de pruebas se realiza desde las herramientas administrativas de Firebase.
