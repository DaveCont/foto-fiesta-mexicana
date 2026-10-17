# Verificación de la implementación

Se implementaron los pasos 1–15 de `plan-app-marcos.md`. Los originales de `Marcos/` se usan solo como entrada de lectura.

- `npm test`: se usa el runner nativo con `--test-isolation=none` porque este entorno restringe crear subprocesos (`spawn EPERM`). Las pruebas verifican procesamiento, calibración, encuadre, tamaños, manifiesto de marcos y almacenamiento de respaldo.
- `npm run build:frames`: genera el manifiesto; los casos vacío y PNG se verifican en directorios temporales.
- `node --check`: módulos, scripts y service worker.
- `npm run serve`: servidor estático local en `127.0.0.1:8080`; inicio, manifest, service worker y frames responden 200.
- `tests/browser.html`: recorrido automatizado para abrir con el servidor local. Importa marco y foto de prueba, ajusta, muestra al cliente, genera y valida JPEG, solicita descarga y vuelve al inicio. Chrome headless está instalado pero no pudo arrancar en este entorno por acceso denegado en Mojo/Crashpad. El recorrido queda pendiente de ejecución en un navegador permitido.
- Verificar cámara, orientación EXIF, instalación, offline, gestos, WhatsApp e impresión en iPad/Android reales al publicar.
- Los commits solicitados no se pudieron crear: `.git` está montado como solo lectura y Git no puede crear `.git/index.lock`. No se cambió de rama ni se hizo push.

Grupos sugeridos para los commits en español una vez habilitada la escritura de Git: «Agrega base PWA y módulos de fotos, marcos y procesamiento», «Implementa flujo de edición, cliente y entrega de fotos», «Agrega pruebas, recursos y documentación de uso».
