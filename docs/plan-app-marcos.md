# Plan: App de marcos "Foto Fiesta Mexicana" (PWA)

## Objetivo
Construir la PWA descrita en `docs/superpowers/specs/2026-10-16-foto-marcos-design.md` (LEER COMPLETO ANTES DE EMPEZAR; es la fuente de verdad). Tomar foto con la cámara nativa → ajustar/corregir mancha → elegir marco (siempre con "Sin marco") → compartir/imprimir/guardar JPEG al tamaño de impresión.

## Reglas generales
- HTML/CSS/JS vanilla con ES modules. **Sin frameworks ni dependencias npm en runtime.** Sin bundler. La app se sirve como archivos estáticos.
- Node ≥ 24 disponible. Pruebas con `node --test` (sin dependencias). Si necesitas un servidor local, usa `npx --yes http-server -c-1 .` o un script Node propio.
- No modificar ni borrar nada en `Marcos/`. La carpeta puede estar vacía.
- Interfaz 100% en español. Botones táctiles ≥ 56 px. Diseño responsive (celular vertical, tablet vertical y horizontal), sin scroll horizontal.
- Estilo visual: fiesta mexicana alegre pero legible. Paleta: rosa mexicano `#E4007C`, naranja `#FF6B00`, amarillo `#FFC400`, verde `#00A86B`, turquesa `#00A3AD`, fondo oscuro `#1A1423` (para que la foto resalte), texto `#FFF8EE`. Tipografía: "Baloo 2" (títulos) de Google Fonts con fallback `system-ui`; cuerpo `system-ui`. Las fuentes deben quedar cacheadas por el service worker o, si falla, usar el fallback sin romper.
- Separar lógica pura (testeable en Node, sin DOM) de la UI. Los módulos puros operan sobre objetos tipo `{width, height, data: Uint8ClampedArray}` (compatibles con `ImageData`).
- Hacer commits pequeños por grupo de pasos (mensajes en español). No crear ramas ni hacer push.

## Pasos

1. **Esqueleto PWA**
   - `index.html` (contenedores de las pantallas: inicio, editar, mostrar-cliente, final, ajustes), `css/app.css`, `js/app.js` (router simple por estado, sin recargar).
   - `manifest.webmanifest` (name "Foto Fiesta Mexicana", short_name "Foto Fiesta", `display: standalone`, `orientation: any`, colores de la paleta). Iconos `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png` generados por un script Node sin dependencias (`scripts/make-icons.mjs`, puedes escribir PNG con zlib nativo) con un diseño simple (círculo rosa con cámara/marco estilizado).
   - `package.json` con scripts: `"test": "node --test tests/"`, `"build:frames": "node scripts/build-frames.mjs"`, `"serve": "npx --yes http-server -c-1 ."`. Sin dependencias.

2. **`js/storage.js`**: wrapper IndexedDB (stores `frames` y `calibration`) y `localStorage` con try/catch; si falla el almacenamiento, la app sigue funcionando en memoria.

3. **`scripts/build-frames.mjs` + `js/frames.js`**
   - Script: lee `Marcos/*.png` (case-insensitive), obtiene ancho/alto leyendo el chunk IHDR del PNG, escribe `frames.json` `[{id, name, src: "Marcos/<archivo>", width, height, orientation: "portrait"|"landscape"|"square"}]`. Carpeta vacía → `[]`. El nombre mostrado se deriva del archivo (sin extensión, guiones/guiones bajos → espacios, capitalizado).
   - Módulo: carga `frames.json` + marcos de IndexedDB (agregados por el usuario, con `source: "user"`), genera miniaturas en la app (canvas, lado largo 240 px, cacheadas en memoria), filtra por orientación de la foto (square se muestra en ambas). "Sin marco" es un elemento fijo, siempre primero.
   - Agregar marcos: `<input type="file" accept="image/png" multiple>`; validar que sea PNG; si no tiene píxeles transparentes, aceptarlo y mostrar aviso.

4. **`js/camera.js`**: botón "Tomar foto" (`<input type="file" accept="image/*" capture="environment">`) y "Desde galería" (sin `capture`). Decodificar con `createImageBitmap(file, {imageOrientation: "from-image"})` (fallback a `<img>`). Si el lado mayor × menor > 16 MP, reducir proporcionalmente. Determinar orientación de la foto.

5. **`js/adjust.js` (puro)** — funciones sobre ImageData:
   - `applyAdjustments(img, params)` con `params = {brightness, contrast, saturation, temperature, sharpness, filter, auto}` (rangos −100..100 salvo sharpness 0..100; filter ∈ natural|vivo|calido|frio|bn|sepia). Orden: auto (Mejorar) → brillo/contraste/saturación/temperatura → filtro → nitidez (unsharp mask suave, radio ~1 px, cantidad máx. 0.6).
   - `computeAutoLevels(img)` → percentiles 0.5%/99.5% por luminancia; estiramiento lineal + saturación +10.
   - Defaults neutros → salida idéntica a la entrada (probar).

6. **`js/vignette.js` (puro)** — calibración de mancha:
   - `buildCalibrationMap(img)` → reducir a lado largo 256, gris, desenfoque gaussiano grande (sigma ≈ 8% del lado largo, implementado como box blur de 3 pasadas), normalizar por percentil 90 → `{width, height, data: Float32Array}` con valores en (0, 1].
   - `applyCalibration(img, map, intensity)` → por píxel `gain = 1 / lerp(1, mapBilinear(x,y), intensity)`, gain máx. 2.5, aplicar a R,G,B.
   - Guardar mapas por orientación (`portrait` / `landscape`) en IndexedDB. Calibración se hace desde Ajustes con la cámara nativa; mostrar instrucciones: limpiar lente, superficie lisa clara, mismo zoom del evento, recalibrar cada evento.

7. **`js/compose.js` (puro + canvas)**
   - `printSizePx(size, orientation)`: 4x6 → 1200×1800 / 1800×1200; 5x7 → 1500×2100; 6x8 → 1800×2400 (300 ppp).
   - `coverTransform(photoW, photoH, canvasW, canvasH, {panX, panY, zoom})` (puro): escala "cover" × zoom (1..4), pan limitado para no dejar huecos. Probar los límites.
   - `renderFinal(photo, adjustParams, calibration, frame, printSize)` → canvas a tamaño de impresión: dibuja la foto con transform, aplica corrección de mancha + ajustes sobre el ImageData del lienzo, dibuja el marco escalado al lienzo completo. "Sin marco" = solo foto. Export JPEG 0.92, nombre `fiesta-AAAAMMDD-HHMMSS.jpg`.
   - Nota: la calibración debe aplicarse en coordenadas de la FOTO original (antes del recorte). Hazlo aplicando la corrección a la foto (o a la región visible mapeando coordenadas), no al lienzo recortado.
   - Vista previa: misma tubería con una versión reducida de la foto (lado largo ≤ 1600) y recálculo con `requestAnimationFrame` + debounce de ~80 ms al mover deslizadores.

8. **Pantalla Editar (UI)**: vista previa grande con pan (arrastrar) y zoom (pellizco y rueda del ratón) vía Pointer Events; botón "Centrar"; tira inferior de miniaturas deslizable con "Sin marco" primero y selección resaltada; panel plegable "Ajustes" (filtros como chips, deslizadores, "Mejorar", "Restablecer", interruptor + deslizador "Corregir mancha" 0–100 % por defecto 70 %, deshabilitado con texto "Calibra para esta orientación" si no hay mapa); botón "Mostrar al cliente"; botón "Listo".

9. **Pantalla Mostrar al cliente**: pantalla completa (Fullscreen API si existe), solo la vista previa, deslizar o flechas grandes para cambiar de marco, indicador del nombre del marco, botón discreto para salir. El marco elegido aquí queda seleccionado al volver.

10. **Pantalla Final + `js/share.js`**: vista previa del resultado; botones "Compartir / Imprimir" (principal: `navigator.canShare({files})` → `navigator.share({files:[file], title})`; `AbortError` no es error), "Guardar" (descarga con `<a download>`), "Tomar otra" (libera memoria y vuelve a Inicio). Si share no está disponible, "Compartir / Imprimir" descarga y muestra instrucción breve.

11. **Pantalla Ajustes de la app**: tamaño de impresión (4x6 por defecto, 5x7, 6x8), calibrar vertical / horizontal y borrar calibración, agregar/eliminar marcos del usuario (los empaquetados no se pueden borrar), texto con consejos de la mancha.

12. **`sw.js`**: precache de la app (html, css, js, manifest, iconos, `frames.json` y los PNG listados), estrategia cache-first con actualización en segundo plano; versión de caché como constante. Registrar desde `app.js`. Wake Lock API al estar en pantallas de editar/cliente (si existe; reactivar en `visibilitychange`).

13. **Manejo de errores** (spec §10): mensajes amables en español en un toast; nunca pantalla en blanco; si falla por memoria al exportar, reducir a 75 % y reintentar una vez.

14. **Pruebas** en `tests/` (`node --test`):
    - adjust: parámetros neutros = identidad; brillo +/− mueve la media en la dirección correcta; B/N produce R=G=B; auto-levels estira un rango comprimido.
    - vignette: mapa de una imagen uniforme ≈ 1 en todo; imagen con esquina oscura → `applyCalibration` con intensidad 1 iguala aprox. la esquina al centro (tolerancia); intensidad 0 = identidad; gain nunca > 2.5.
    - compose: `printSizePx` para los 3 tamaños y ambas orientaciones; `coverTransform` cubre todo el lienzo para zoom 1 y pan extremo.
    - build-frames: con carpeta temporal vacía → `[]`; con un PNG generado en el test → dimensiones y orientación correctas.
    - Crear 2 marcos de PRUEBA en `tests/fixtures/` (no en `Marcos/`) para las pruebas.

15. **README.md** en español, corto: cómo agregar marcos (PNG con centro transparente, 1200×1800 vertical o 1800×1200 horizontal recomendado), correr `npm run build:frames`, probar local con `npm run serve`, y publicar en GitHub Pages o Netlify (pasos). Cómo instalar en iPad (Safari → Compartir → Agregar a inicio) y en Android (Chrome → Instalar app). Cómo calibrar la mancha.

## Verificación
1. `npm test` → todas las pruebas pasan.
2. `npm run build:frames` → genera `frames.json` válido (con `Marcos/` vacío da `[]`).
3. Levantar el servidor local y comprobar que `index.html`, `manifest.webmanifest`, `sw.js`, `frames.json` responden 200 y que no hay errores de sintaxis en los módulos (p. ej. `node --check` sobre cada archivo de `js/` y `scripts/`).
4. Si tienes un navegador headless disponible, recorrer el flujo con una imagen de prueba hasta generar el JPEG; si no, indicarlo en el resumen.

## Al terminar
Resumen MUY breve: archivos creados, resultado de pruebas, y pendientes o limitaciones.
