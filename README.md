# Avisa Campus

Aplicación del curso 1INF36 Ética y RSU, PUCP, para reportar problemas del campus, confirmar incidentes y consultar su atención. Conserva la interfaz del prototipo: colores, tipografías, tarjetas, filtros, formulario, fotografías, modales, Gestión y tema oscuro.

URL de GitHub Pages: **https://sebasgomezg.github.io/1INF36-0881-L5/**. **Sitio activo, conectado a Firebase real y comprobado desde la URL pública.** Evidencia en [PRUEBAS.md](PRUEBAS.md).

## Arquitectura y producción

- Sitio estático en `docs/`, sin framework, bundler ni backend Express.
- Firebase JavaScript **12.13.0 Compat por CDN**, para conservar las operaciones del prototipo.
- Proyecto real **etica-cec4a**, plan **Spark** sin facturación habilitada.
- Firestore Standard, base `(default)`, región `southamerica-west1`.
- Authentication anónimo para estudiantes; correo/contraseña para administración. La sesión existente se restaura antes de crear una identidad anónima.
- Reglas e índices desplegados; dominio `sebasgomezg.github.io` autorizado.
- Cloud Functions y Resend preparados para el futuro: **no desplegados**, no necesarios para el sitio y no se habilitó Blaze.

`docs/js/firebase-config.js` contiene el objeto web público proporcionado por el equipo, en modo `production`. No son credenciales administrativas. No se inicializa Analytics, Storage ni mensajería aunque sus identificadores estén en el objeto. No se usa localStorage como base de datos.

## Ejecución local

Requisitos: Node.js 22 LTS y Java 21+ para emuladores. Las pruebas de esta sesión utilizaron Node 24.13.1 y Java 24.0.2; las funciones declaran runtime Node 22.

```powershell
npm ci
npm --prefix functions ci
npm run emulators
```

En otra terminal:

```powershell
npm run seed
npm run serve
```

Abrir **http://127.0.0.1:4173/1INF36-0881-L5/?mode=emulator** para trabajar exclusivamente con datos ficticios. Seed siempre apunta a `demo-avisa-campus`, Auth :9099 y Firestore :8080; genera una contraseña administrativa aleatoria en `.demo-admin.local` (ignorado por Git). Interfaz de emuladores: http://127.0.0.1:4000/. Los correos del emulador se marcan SIMULADOS.

**Abrir la página local sin ?mode=emulator conecta a Firebase real.** El modo por URL solo permite emuladores en localhost, nunca en Pages; no hay caída silenciosa a producción desde pruebas. El modo `pending` queda disponible para diagnósticos o proyectos sin configurar, pero no es el modo publicado. Se necesita conexión para descargar el SDK y las fuentes desde CDN. Los datos del emulador son temporales salvo exportación/importación explícita en `emulator-data/`.

## Usuarios y administración

Los estudiantes no se registran ni introducen contraseña. Su identidad anónima permite consultar sus reportes privados y confirmar una vez por incidente; puede cambiar al borrar los datos del navegador o usar otro dispositivo. No se promete anonimato absoluto ni una sola identidad por persona física. Los UID no aparecen en documentos públicos.

Gestión → iniciar sesión con la cuenta administrativa creada. La contraseña generada se guarda solo en el archivo local `.admin-credential.local`, ignorado por Git; no se publica ni se incluye en documentación. Compartirla únicamente por un canal privado autorizado. Para futuras cuentas: crearlas desde Firebase Console → Authentication → Usuarios y registrar desde Console `admins/<uid>` con `habilitado: true`. El navegador no puede crear roles. Para revocar una cuenta, eliminar su documento de autorización y cerrar sesión. Al recargar se conserva al administrador; cerrar sesión vuelve explícitamente al acceso anónimo.

## Seguridad y datos

| Ruta | Uso y privacidad |
|---|---|
| `incidentes/{id}` | Datos públicos solo cuando visibilidad es `publico`; revisión y archivo son privados. Código legible, fechas de servidor, estado, respuesta, miniatura, contador y versión. |
| `autores/{id}` | Identidad propietaria y declaraciones de privacidad, separadas del documento público. |
| `fotos/{id}` | JPEG comprimido con los permisos del incidente padre. |
| `contactos/{id}` | Correo consentido; solo propietario y administración. |
| `usuarios/{uid}/votos/{id}` | Una confirmación por identidad/incidente, que puede retirarse. No se publican listas de votantes. |
| `incidentes/{id}/historial/{version}` | Cambios administrativos inmutables y con la privacidad del padre. |
| `admins/{uid}` | Autorización privilegiada desde Console; requiere sesión por contraseña. |
| `eliminaciones/{id}` | Bloqueo para completar o reanudar la limpieza de un retirado. |
| `notificaciones/{id-version}` | Cola privada para la futura opción automática; no hay funciones de correo activas en Spark. |

Los registros se crean en lotes atómicos junto con foto, autor y contacto. Los votos y cambios administrativos usan transacciones. Las reglas validan campos, tipos, límites, pertenencia e historial; el contador solo cambia junto con el voto propio. Los usuarios no pueden leer privados de terceros, contactos ajenos ni concederse privilegios. Las consultas públicas incluyen `where('visibilidad','==','publico')`; las reglas no actúan como filtros.

Los reportes sobre personas se crean privados. Gestión permite ver expedientes y fotos, aprobar, descartar sin publicar, responder, cambiar estado, retirar y restaurar sin perder fotos. Se registra historial con fechas del servidor. El borrado definitivo de retirados se realiza en lotes reanudables de hasta 400: limpia historial, votos, notificaciones, foto, contacto, autor y reporte. Si se interrumpe, repetir la operación; no requiere Functions. No borrar únicamente el documento padre desde Console.

Las fotografías se decodifican y recodifican en Canvas. Entrada JPG/PNG/WebP hasta 10 MiB y 40 millones de píxeles; JPEG hasta 190 000 caracteres Base64 y miniatura hasta 24 000. Resoluciones máximas iniciales 1100 y 240 px. Los documentos quedan por debajo de 1 MiB; imágenes y textos extensos se excluyen de índices. Las reglas no reconocen rostros ni contenido semántico: la declaración de privacidad y la revisión humana siguen siendo necesarias.

La demostración carga la colección pública completa y filtra/ordena en el navegador; considerar paginación al aumentar el volumen. Listeners, imágenes y lecturas de reglas consumen cuotas de Spark.

## Avisos manuales en Spark

El formulario explica que el contacto es opcional y que el aviso es **manual**. Requiere consentimiento. Al cerrar un incidente, Gestión → abrir el expediente → **Preparar correo manual** o **Copiar mensaje**. El borrador contiene código, título, estado, respuesta y fecha. Abrir `mailto:` o copiar no significa que se envió ni entregó el mensaje; la aplicación no registra una entrega ficticia.

Después del envío efectivo, eliminar el contacto desde el expediente. La administración debe revisar y eliminar contactos a más tardar en 30 días; esta tarea es manual en Spark. Los correos permanecen privados y no aparecen en tarjetas ni en el historial público.

La opción automática sigue en `functions/`, deshabilitada mediante `notificationsEnabled: false`. Para habilitarla en el futuro se necesita autorización explícita para Blaze, configurar Resend y remitente verificado, guardar RESEND_API_KEY en Secret Manager y desplegar solo esas funciones. Nunca colocar ese secreto en docs/. Las funciones implementan cola única, bloqueo, idempotencia, plantillas HTML/texto y reintentos; conservan contactos si falla el proveedor y distinguen aceptación de entrega. No se ha probado envío real. [Requisitos de funciones](https://firebase.google.com/docs/functions/manage-functions) e [idempotencia de Resend](https://resend.com/changelog/idempotency-keys).

## Pruebas

```powershell
npm test
npm run test:rules
npm run test:core
npm run test:integration
```

Ejecutarlas secuencialmente y sin otros emuladores ocupando los puertos. Se fija siempre el proyecto demo; los rechazos PERMISSION_DENIED de los casos negativos son esperados.

Para navegador local: `python -m pip install -r tests/requirements.txt`, `python -m playwright install chromium`; con emuladores, seed y servidor activos, ejecutar `npm run test:browser`. Genera capturas y resultados en test-results/, ignorado por Git.

`tests/production-browser.py` prueba explícitamente la URL pública con dos estudiantes independientes y un administrador, solicitudes de SDK sujetas a reglas, fotos y persistencia. Solo ejecutarlo con autorización y `$env:AVISA_ALLOW_PRODUCTION_TESTS='etica-cec4a'`; requiere el archivo local de acceso administrativo. Crea reportes PRUEBA TÉCNICA y elimina únicamente sus propios datos, verificando el prefijo antes de limpiar. No envía correos. Los resultados reales están en PRUEBAS.md.

## Publicación y actualizaciones

Repositorio: https://github.com/sebasgomezg/1INF36-0881-L5, rama principal verificada `main`. Pages usa **Deploy from a branch → main → /docs**; incluye .nojekyll. No se despliega Firebase Hosting y no hay workflow personalizado.

Para actualizar: modificar archivos, ejecutar las pruebas pertinentes, revisar que no haya secretos ni datos privados, hacer commit y push a main, esperar el build de Pages y verificar la URL pública. Pages puede servir recursos en caché durante unos minutos; comprobar la revisión publicada y recargar sin caché si se mantiene una pestaña antigua. No hay service worker.

Si se cambian reglas o índices, revisar primero la versión remota y ejecutar las pruebas antes de `npx firebase deploy --only firestore --project etica-cec4a`. Este comando no publica Functions ni Hosting. Los filtros y orden se resuelven en memoria, por lo que no se requieren índices compuestos adicionales. El índice de grupo de votos y las exclusiones están en firestore.indexes.json.

`prototipo/Avisa Campus.html` conserva íntegramente el original como referencia histórica; no es el punto de entrada publicado. Ver [pendientes](PENDIENTE_CONFIGURACION_FIREBASE.md) y [evidencia de pruebas](PRUEBAS.md).


## Actualización 30 de octubre: cuentas y fotografías

La navegación pública usa Iniciar sesión con popup de acceso/registro. Los estudiantes eligen un seudónimo y contraseña; Firebase Auth utiliza internamente un identificador de correo técnico @usuarios.avisa.invalid, sin solicitar un correo real. Las contraseñas se gestionan exclusivamente mediante Authentication y no se guardan en Firestore. La cuenta administrativa conserva su correo existente. No hay recuperación por correo para seudónimos sin dirección real.

Los visitantes consultan reportes; registrar y confirmar exige cuenta también en las reglas. El registro vincula la sesión anónima actual para preservar sus reportes. Mis reportes reúne publicaciones, pendientes y reportes propios, con detalle e historial. Las suscripciones actualizan tarjetas y detalles de estudiantes. No se publican usuarios en los incidentes.

Se quitaron los avisos técnicos de conexión exitosa. Se conserva la apariencia, con marco 4:3 para fotos del detalle, object-fit:contain y visor superpuesto responsive con Cerrar. Las tarjetas mantienen miniaturas cuadradas.

Pruebas de esta actualización: npm test 13/13 y reglas en emulador 9/9. Prueba real local de cuenta nueva, reporte, Mis reportes, persistencia, acceso administrativo y limpieza correcta. La comprobación con fotos y desde Pages se registra en el cierre de la sesión; los resultados históricos anteriores no validan por sí solos este nuevo flujo.

Los avisos automáticos siguen sin desplegarse por Spark; se conserva el borrador manual consentido. No se habilitan servicios de pago.


Actualización: se elimina el flujo de retirados/restauración. El borrado administrativo es definitivo y limpia datos asociados. Las pruebas usan cuentas técnicas y su limpieza se realiza mediante operaciones privilegiadas de Firebase, sin opción de borrar cuentas en la interfaz. El correo es manual (mailto/copiar); no hay envío automático activo.

No hay estado ni sección de retirados; las únicas visibilidades vigentes son publico y revision. No hay opción de eliminar cuentas en la interfaz. Las cuentas de prueba se eliminan únicamente desde Firebase Admin.


## Cierre de limpieza de ensayos y eliminación del flujo de retirados

No existe sección ni estado de retirados en la aplicación vigente. Las reglas admiten solo visibilidad publico/revision. El borrado administrativo elimina definitivamente el reporte y sus datos asociados; no lo traslada a otro estado. Los apartados históricos de esta documentación describen versiones anteriores.

Se eliminaron los dos reportes técnicos señalados y dos cuentas de ensayo verificadas mediante Firebase Admin. La prueba nueva utilizó una cuenta técnica y se limpiaron después su reporte y su cuenta mediante operaciones privilegiadas, sin usar eliminación de cuentas desde el navegador. Consulta posterior: cero reportes de esos ensayos y cero cuentas técnicas pendientes. No se borraron cuentas reales ni se modificó la facturación.

Validación local: 13 pruebas unitarias y 9 pruebas de reglas correctas; prueba de navegador con Firebase real correcta. El correo automático sigue deshabilitado. La opción manual prepara un mailto o copia el mensaje; no equivale a envío ni entrega. No hay controles de eliminación de cuentas en el frontend. La limpieza de pruebas se realiza desde las herramientas administrativas de Firebase.
