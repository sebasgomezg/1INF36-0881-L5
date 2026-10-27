# Pruebas de Avisa Campus — 27 de octubre de 2026

## Pruebas automatizadas

- npm test: **13/13** correctas en esta ejecución (plantillas, consentimiento del borrador manual, restauración de sesiones, inicialización única, guardas de entornos, rutas, CSS/controles y validaciones).
- npm run test:rules: **8/8** correctas en esta ejecución. Pruebas positivas y negativas mediante SDK cliente sujeto a reglas: privados/fotos/contactos, votos y contador, roles, estados/historial, aprobación/retiro/restauración y reintentos.
- Las pruebas de core (5) e integración (1) se verificaron en la migración y se repiten antes de cerrar esta publicación. No se presentan mocks como correos enviados.
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

URL de destino: https://sebasgomezg.github.io/1INF36-0881-L5/. Publicación y verificación pública pendientes de la siguiente etapa; no se confunden los resultados locales con la comprobación de Pages.

## Límites

Windows, Node 24.13.1, Java 24.0.2, CLI 15.34.1, Firestore Emulator 1.22.0, Firebase JS Compat 12.13.0, Admin 14.5.0, Functions 7.4.0 y Chromium 141. Las funciones declaran Node 22, pero no se desplegaron. Los avisos manuales no prueban envío ni entrega; Functions/Resend solo tienen pruebas locales simuladas. No se activó Analytics, Storage, Hosting de Firebase ni facturación.
