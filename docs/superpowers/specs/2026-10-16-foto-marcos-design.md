# Foto Fiesta Mexicana — App de marcos para escenario fotográfico

Fecha: 2026-10-16 · Estado: diseño para aprobación

## 1. Objetivo
App para usar en un escenario fotográfico: el fotógrafo toma la foto con la tablet/celular, el cliente ve cómo queda con cada marco (o sin marco), elige uno, y la foto se imprime y/o se envía por WhatsApp. Todo en un solo dispositivo, rápido, con botones grandes y sin cuentas.

## 2. Decisiones tomadas
| Tema | Decisión |
|---|---|
| Plataforma | PWA (app web instalable), HTML/CSS/JS sin framework pesado. Funciona offline tras la primera carga. |
| Dispositivos | iPad (Safari ≥ 16.4) y Android (Chrome ≥ 110). Tablet y celular. |
| Cámara | Cámara nativa del sistema vía `<input type="file" accept="image/*" capture="environment">` (resolución completa). Botón alterno "Desde galería" (mismo input sin `capture`). |
| Marcos | PNG con transparencia. (a) Empaquetados desde `Marcos/` en el build mediante un manifiesto `frames.json` generado por script. (b) Botón "Agregar marcos" que guarda PNG en IndexedDB. |
| Impresión | Generar JPEG final al tamaño de impresión y usar `navigator.share({files})` → el usuario elige Imprimir (AirPrint/servicio Android). Respaldo: descargar archivo. |
| Entrega al cliente | Impresa + WhatsApp mediante el mismo menú Compartir. |
| Hospedaje | HTTPS estático gratuito (GitHub Pages o Netlify). Las fotos nunca salen del dispositivo. |
| Servidor/BD | Ninguno. |

## 3. Flujo de pantallas
1. **Inicio/Cámara**: botón gigante "Tomar foto", botón secundario "Desde galería", icono de ajustes.
2. **Editar y elegir marco** (pantalla principal):
   - Vista previa grande: foto + marco seleccionado.
   - Tira inferior de miniaturas deslizable; **"Sin marco" siempre primera y siempre visible**. Toque = seleccionar.
   - Se muestran solo marcos con la misma orientación que la foto (vertical/horizontal); "Sin marco" siempre.
   - Encuadre: arrastrar (pan) y pellizcar (zoom) la foto dentro del área del marco; botón "Centrar".
   - Panel "Ajustes" plegable (ver §4).
   - Botón "Mostrar al cliente": pantalla completa, solo la vista previa y flechas/deslizar para cambiar de marco.
   - Botón "Listo".
3. **Final**: vista previa final + botones "Compartir / Imprimir" (principal), "Guardar", "Tomar otra" (vuelve a 1 y descarta la foto de memoria).

## 4. Ajustes de foto
- Filtros de un toque: Natural, Vivo, Cálido, Frío, B/N, Sepia.
- Deslizadores: brillo, contraste, saturación, temperatura, nitidez (suave, máx. moderado).
- Botón "Mejorar" automático: estiramiento de niveles por percentiles (0.5%/99.5%) + leve aumento de saturación.
- Botón "Restablecer".
- Corrección de mancha (ver §5): interruptor + deslizador de intensidad (0–100%, por defecto 70%).
- Orden de aplicación: corrección de mancha → Mejorar → brillo/contraste/saturación/temperatura → filtro → nitidez.
- Implementación: procesamiento por píxel propio (o WebGL), **no** depender de `ctx.filter` (no soportado en Safari antiguos). Vista previa en versión reducida (lado largo ≤ 1600 px); export a resolución completa con los mismos parámetros.

## 5. Calibración de mancha del lente
- En Ajustes de la app: "Calibrar mancha" → abre cámara nativa → usuario fotografía una superficie lisa y uniforme (pared/tela clara), mismo zoom que usará en el evento.
- Se calcula un mapa de iluminación: imagen reducida (p. ej. 256 px lado largo) a escala de grises, desenfoque gaussiano grande, normalizado por su valor de referencia (percentil 90). Se guarda en IndexedDB **por orientación** (vertical / horizontal).
- Aplicación: por cada píxel, `corregido = original / lerp(1, mapa, intensidad)` con mapa interpolado bilinealmente a la resolución de la foto; límite de ganancia máx. 2.5× para evitar ruido/halos.
- Si no existe calibración para la orientación actual, el interruptor aparece deshabilitado con el texto "Calibra para esta orientación".
- Texto de ayuda en pantalla: limpiar el lente primero; recalibrar al inicio de cada evento; mantener el mismo zoom.
- Limitación conocida: recupera brillo/contraste, no nitidez perdida.

## 6. Salida (imagen final)
- Tamaños de impresión configurables en Ajustes: 4×6" (por defecto), 5×7", 6×8". 300 ppp → 4×6 = 1200×1800 px (vertical) / 1800×1200 (horizontal).
- Composición: foto ajustada y encuadrada (cover) + PNG del marco escalado al lienzo completo. "Sin marco": solo la foto al tamaño de impresión.
- JPEG calidad 0.92, nombre `fiesta-AAAAMMDD-HHMMSS.jpg`.
- Si el lado largo de la foto supera el límite seguro de canvas en iOS (~16 MP), reducir antes de procesar.
- `navigator.share` con archivo; si no está disponible o falla → descarga con `<a download>`.

## 7. Ajustes de la app (pantalla de configuración)
- Tamaño de impresión.
- Calibrar mancha (vertical / horizontal) y borrar calibración.
- Agregar marcos (PNG) / eliminar marcos agregados (los empaquetados no se pueden borrar).
- Persistencia en `localStorage` (preferencias) e IndexedDB (marcos y calibración), todo con try/catch.

## 8. Comportamiento PWA
- `manifest.webmanifest` (nombre, iconos, `display: standalone`, orientación libre).
- Service worker: precache de la app y de los marcos empaquetados.
- Wake Lock API para que la pantalla no se apague (si está disponible).
- Interfaz en español; botones táctiles ≥ 56 px; colores festivos mexicanos con buen contraste.

## 9. Estructura de archivos
```
index.html
manifest.webmanifest
sw.js
css/app.css
js/app.js          (navegación entre pantallas, estado)
js/camera.js       (entrada de foto, lectura EXIF/orientación vía createImageBitmap)
js/frames.js       (carga frames.json + IndexedDB, filtro por orientación)
js/adjust.js       (filtros, deslizadores, Mejorar, nitidez — funciones puras sobre ImageData)
js/vignette.js     (calibración y corrección de mancha — funciones puras)
js/compose.js      (encuadre, composición final, export JPEG)
js/share.js        (compartir/imprimir/guardar)
js/storage.js      (IndexedDB/localStorage)
Marcos/            (PNG originales — no modificar)
scripts/build-frames.mjs  (genera frames.json desde Marcos/, sin dependencias; miniaturas se generan en la app)
tests/             (pruebas unitarias de adjust, vignette, compose)
```

## 10. Errores y casos límite
- Foto no se puede leer → mensaje "No se pudo abrir la foto, intenta de nuevo".
- Carpeta `Marcos` vacía → la app funciona solo con "Sin marco" y sugiere agregar marcos.
- PNG de marco sin transparencia → se acepta pero se advierte.
- Compartir cancelado por el usuario → no es error, se queda en pantalla final.
- Memoria insuficiente → reducir resolución y reintentar una vez.

## 11. Pruebas y verificación
- Pruebas unitarias (Node, `node --test`) para funciones puras: ajustes, Mejorar, mapa de calibración y corrección, cálculo de encuadre/tamaños.
- `scripts/build-frames.mjs` ejecuta sin errores con carpeta vacía y con PNG de ejemplo.
- Prueba manual en navegador de escritorio (servidor local) con imágenes de prueba: flujo completo hasta descargar el JPEG.
- Prueba en dispositivo real (iPad y/o Android) tras publicar: cámara, compartir a WhatsApp, imprimir.

## 12. Fuera de alcance (v1)
Corrección manual de mancha por zona, IA de mejora, galería/historial de fotos, códigos QR, impresión directa sin diálogo, múltiples fotos por hoja.
