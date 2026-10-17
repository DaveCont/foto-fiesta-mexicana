# Foto Fiesta Mexicana

PWA privada y sin cuentas: las fotos se procesan en el dispositivo. Requiere Node 24 para preparar los archivos; no hay dependencias de ejecución.

1. Agrega PNG con centro transparente a `Marcos/` (recomendado: 1200 × 1800 vertical o 1800 × 1200 horizontal). La app también permite agregar y eliminar marcos propios desde Ajustes.
2. Ejecuta `npm run build:frames`, luego `npm test` y `npm run serve`.
3. Abre http://localhost:8080. Usa `tests/fixtures/foto.png` para probar foto, ajustes, marcos y Guardar. Los dos marcos de prueba están en `tests/fixtures/`.

Para publicar en GitHub Pages, sube los archivos a tu repositorio, abre Settings → Pages, selecciona la rama y la carpeta raíz y guarda. Para Netlify, arrastra la carpeta del proyecto a la publicación manual, o conecta el repositorio con comando `npm run build:frames` y directorio de publicación `.`. Genera siempre `frames.json` antes de publicar. Cambia la versión de caché en `sw.js` al publicar nuevas versiones. Necesitas HTTPS para instalación y funciones del dispositivo.

En iPad (Safari ≥ 16.4): Compartir → Agregar a inicio. En Android (Chrome ≥ 110): menú → Instalar app. Abre la app una primera vez con conexión y espera a que termine la descarga de marcos para usarla sin conexión. Si la fuente externa no está disponible se usa la fuente del sistema.

En Ajustes elige tamaño de impresión y calibra la mancha para cada orientación: limpia el lente, fotografía una pared o tela clara uniforme, mantén el mismo zoom y repite al comenzar cada evento. La corrección recupera iluminación, no nitidez perdida. Actívala en los ajustes de foto. Los datos persisten localmente; si el navegador bloquea almacenamiento, funcionan durante la sesión.

Compartir / Imprimir abre el menú del sistema cuando permite archivos. Elige WhatsApp o el servicio de impresión disponible. Si no está disponible, se descarga el JPEG para abrirlo y compartirlo o imprimirlo desde el dispositivo. Cancelar el menú conserva la foto. La impresión y WhatsApp deben verificarse en un iPad/Android real tras publicar.
