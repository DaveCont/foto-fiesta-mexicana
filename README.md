# Foto Fiesta Mexicana

PWA privada y sin cuentas: las fotos se procesan en el dispositivo. Requiere Node 24 para preparar los archivos; no hay dependencias de ejecución.

1. Agrega PNG con centro transparente a `Marcos/` (los 9 marcos actuales son horizontales para carta). La app también permite agregar y eliminar marcos propios desde Ajustes.
   Todos los marcos se muestran siempre: se estiran a carta (por defecto), tabloide o los otros formatos y se giran para fotos verticales. Usa Girar marco para invertirlos 180 grados. Para mejor nitidez en tabloide, usa PNG de al menos 3400×2200 px.
2. Ejecuta `npm run build:frames`, luego `npm test` y `npm run serve`.
3. Abre http://localhost:8080. Usa `tests/fixtures/foto.png` para probar foto, ajustes, marcos y Guardar. Los dos marcos de prueba están en `tests/fixtures/`.

Para publicar en GitHub Pages, sube los archivos a tu repositorio, abre Settings → Pages, selecciona la rama y la carpeta raíz y guarda. Para Netlify, arrastra la carpeta del proyecto a la publicación manual, o conecta el repositorio con comando `npm run build:frames` y directorio de publicación `.`. Genera siempre `frames.json` antes de publicar. Cambia la versión de caché en `sw.js` al publicar nuevas versiones. Necesitas HTTPS para instalación y funciones del dispositivo.

En iPad (Safari ≥ 16.4): Compartir → Agregar a inicio. En Android (Chrome ≥ 110): menú → Instalar app. Abre la app una primera vez con conexión y espera a que termine la descarga de marcos para usarla sin conexión. Si la fuente externa no está disponible se usa la fuente del sistema.

En Ajustes elige tamaño de impresión y calibra la mancha para cada orientación: limpia el lente, fotografía una pared o tela clara uniforme, mantén el mismo zoom y repite al comenzar cada evento. La corrección recupera iluminación, no nitidez perdida. Actívala en los ajustes de foto. Los datos persisten localmente; si el navegador bloquea almacenamiento, funcionan durante la sesión.

Compartir / Imprimir abre el menú del sistema cuando permite archivos. Elige WhatsApp o el servicio de impresión disponible. Si no está disponible, se descarga el JPEG para abrirlo y compartirlo o imprimirlo desde el dispositivo. Cancelar el menú conserva la foto. La impresión y WhatsApp deben verificarse en un iPad/Android real tras publicar.
