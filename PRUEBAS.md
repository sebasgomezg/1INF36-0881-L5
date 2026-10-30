# Pruebas de Avisa Campus — 27 de octubre de 2026

## Pruebas automatizadas

- npm test: **13/13** correctas en esta ejecución (plantillas, consentimiento del borrador manual, restauración de sesiones, inicialización única, guardas de entornos, rutas, CSS/controles y validaciones).
- npm run test:rules: **8/8** correctas en esta ejecución. Pruebas positivas y negativas mediante SDK cliente sujeto a reglas: privados/fotos/contactos, votos y contador, roles, estados/historial, aprobación/retiro/restauración y reintentos.
- npm run test:core: **5/5**, y npm run test:integration: **1/1**, repetidas satisfactoriamente en esta ejecución. Total: **27 pruebas automatizadas correctas**. No se presentan mocks como correos enviados.
- La migración original también verificó 10 grupos de comprobaciones de navegador con emuladores; la versión de producción añade las pruebas reales indicadas abajo.

## Firebase real desde localhost

**11 grupos de comprobaciones satisfactorios** contra etica-cec4a, usando SDK cliente Compat en Chromium:

1. SDK CDN, configuración de producción, proyecto correcto, Auth anónimo, lectura y una única Firebase App incluso tras dos inicializaciones concurrentes.
2. Login administrativo por correo/contraseña y sesión conservada tras recargar.
3. Registro real, recarga y persistencia compartida entre dos contextos independientes.
4. Confirmación persistente, rechazo de duplicado, retiro y contador visible en otro cliente.
5. Foto PNG de 1600×1000 recodificada a JPEG, resolución/tamaño limitados, miniatura y modal recuperados; filtros, estadísticas y móvil oscuro sin desbordamiento.
6. Rechazo de solicitudes directas de otro estudiante a privados, fotos, contactos, roles, cambios de estado, votos ajenos y contadores arbitrarios.
7. Aprobación, cambio de estado, respuesta, historial y borrador mailto con contacto ficticio consentido; no se abrió ni envió el correo.
8. Retiro y restauración conservan la foto y se reflejan en otro cliente.
9. Descarte de un reporte privado sin publicarlo.
10. Limpieza de los únicos reportes PRUEBA TÉCNICA creados en la prueba, incluyendo fotos, autores, contactos, votos e historial, y eliminación de las sesiones anónimas de ensayo.
11. Logout y protección de Gestión, con recuperación de sesión anónima.

Sin errores JavaScript no capturados. Resultados y capturas locales en test-results/production-local-results.json y PNG asociados, ignorados por Git.

## Recursos reales verificados

Firestore Standard en southamerica-west1, base (default), plan sin facturación. Auth anónimo y correo/contraseña activos; dominio sebasgomezg.github.io autorizado. Reglas previamente en deny-all revisadas y guardadas en deployment-backups.local/ antes de publicar; la fuente remota coincide con firestore.rules. Índices COLLECTION y COLLECTION_GROUP de votos confirmados READY. Base inicialmente vacía: no se modificaron reportes preexistentes.

## Problemas encontrados y corregidos

Un servidor local de una previsualización anterior seguía sirviendo la configuración pending. Se identificó por PID y por el contenido HTTP, se cerró y se probó el repositorio real. El servidor ahora resuelve docs/ desde su ubicación y no depende del directorio de lanzamiento. Los canales de Firestore permanecen abiertos; las pruebas esperan el estado real de autenticación/lectura en vez de confundirlo con falta de networkidle. Se añadieron la inicialización memoizada y el acceso a expedientes privados/retirados para preparar avisos manuales.

## GitHub Pages

**Publicado y verificado:** https://sebasgomezg.github.io/1INF36-0881-L5/. GitHub Pages activo, HTTPS y HTTP 200, fuente main/docs y build correcto. Los mismos **11 grupos completos se repitieron desde la URL pública**, con dos contextos de estudiante independientes y un tercero administrativo, contra Firebase real y sin emuladores. Incluyen fotos, SDK, pestañas, filtros, estadísticas, seguridad, conservación de sesión, expediente retirado, contacto manual, persistencia compartida, aprobación/descarte/estado/respuesta/historial, retiro/restauración, logout y limpieza.

Se reforzó la prueba para comprobar que un reporte aprobado desaparezca también de la lista privada de su autor y que no aparezca un falso aviso de permisos. Esta regresión falló antes de corregir el listener y pasó tras el cambio. La causa era una suscripción privada creada a partir de la escritura local anticipada de autores, antes de que el servidor pudiera autorizar al propietario. Ahora se usan snapshots confirmados, con cambios de metadatos, antes de abrir esos listeners. Las reglas no se modificaron para ocultar el error. La captura final de escritorio se revisó para confirmar que desapareció el aviso.

Resultados locales: test-results/production-public-results.json y capturas public-mobile.png/public-desktop.png, inspeccionadas visualmente. Ningún error JavaScript no capturado. Los datos PRUEBA TÉCNICA se eliminaron después de las pruebas; la cuenta administrativa permanece operativa. No se alteraron datos preexistentes.

## Límites

Windows, Node 24.13.1, Java 24.0.2, CLI 15.34.1, Firestore Emulator 1.22.0, Firebase JS Compat 12.13.0, Admin 14.5.0, Functions 7.4.0 y Chromium 141. Las funciones declaran Node 22, pero no se desplegaron. Los avisos manuales no prueban envío ni entrega; Functions/Resend solo tienen pruebas locales simuladas. No se activó Analytics, Storage, Hosting de Firebase ni facturación.

## Versiones publicadas

Rama main, commit inicial de aplicación 5cd0c61 y corrección del listener e5b75b4, ambos enviados a origin. El commit de cierre actualiza únicamente la evidencia de publicación y los pendientes. Las credenciales .admin-credential.local, copias de reglas y capturas no están versionadas.


## Actualización 30 de octubre: cuentas y fotografías

La navegación pública usa Iniciar sesión con popup de acceso/registro. Los estudiantes eligen un seudónimo y contraseña; Firebase Auth utiliza internamente un identificador de correo técnico @usuarios.avisa.invalid, sin solicitar un correo real. Las contraseñas se gestionan exclusivamente mediante Authentication y no se guardan en Firestore. La cuenta administrativa conserva su correo existente. No hay recuperación por correo para seudónimos sin dirección real.

Los visitantes consultan reportes; registrar y confirmar exige cuenta también en las reglas. El registro vincula la sesión anónima actual para preservar sus reportes. Mis reportes reúne publicaciones, pendientes y retirados propios, con detalle e historial. Las suscripciones actualizan tarjetas y detalles de estudiantes. No se publican usuarios en los incidentes.

Se quitaron los avisos técnicos de conexión exitosa. Se conserva la apariencia, con marco 4:3 para fotos del detalle, object-fit:contain y visor superpuesto responsive con Cerrar. Las tarjetas mantienen miniaturas cuadradas.

Pruebas de esta actualización: npm test 13/13 y reglas en emulador 9/9. Prueba real local de cuenta nueva, reporte, Mis reportes, persistencia, acceso administrativo y limpieza correcta. La comprobación con fotos y desde Pages se registra en el cierre de la sesión; los resultados históricos anteriores no validan por sí solos este nuevo flujo.

Los avisos automáticos siguen sin desplegarse por Spark; se conserva el borrador manual consentido. No se habilitan servicios de pago.
