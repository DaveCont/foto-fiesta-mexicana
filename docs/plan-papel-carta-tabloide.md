# Plan: papel carta/tabloide, marcos estirados y girados

## Objetivo
Soportar los 9 marcos reales de `Marcos/` (todos horizontales, ~1427×1102, proporción 1.29 = carta horizontal) en papel carta y tabloide: el marco se **estira** al tamaño de la hoja (se acepta distorsión) y se **gira 90°** cuando la foto es vertical. Todos los marcos se muestran siempre.

## Contexto
- App PWA vanilla JS ya existente (ver `docs/superpowers/specs/2026-10-16-foto-marcos-design.md`). El código está compactado en pocas líneas; mantener el estilo existente pero puedes reformatear los archivos que toques si ayuda a la legibilidad.
- No modificar ni borrar nada dentro de `Marcos/`.
- Pruebas: `npm test` (node --test). Hay 14 pruebas que deben seguir pasando.

## Pasos

1. **Tamaños de papel** (`js/compose.js` → `printSizePx`):
   - Agregar `carta`: 2550×3300 (8.5×11", 300 ppp) y `tabloide`: 2200×3400 (11×17", 200 ppp; no subir a 300 ppp: supera el límite de canvas de iOS ~16.7 MP).
   - Mantener `4x6`, `5x7`, `6x8`. Para `landscape` se intercambian ancho y alto (como ya hace).
   - Tamaño por defecto de la app: **`carta`** (en `js/app.js`/preferencias). Si la preferencia guardada no existe en la lista, usar `carta`.
   - En `index.html`, el `<select id="size">` queda en este orden: "Carta (8.5 × 11 in)", "Tabloide (11 × 17 in)", "4 × 6 in", "5 × 7 in", "6 × 8 in".

2. **Orientación de salida y giro del marco**:
   - La orientación de la hoja final = orientación de la foto (vertical u horizontal; una foto cuadrada se trata como vertical).
   - Nueva función pura en `js/compose.js`: `frameRotation(frameOrientation, outputOrientation)` → `90` si una es `portrait` y la otra `landscape`, si no `0` (`square` → `0`).
   - En `renderFinal`, al dibujar el marco: si la rotación es 90, dibujarlo girado 90° en sentido horario (`translate(width,0)` + `rotate(Math.PI/2)` y dibujar con ancho=alto del lienzo, alto=ancho del lienzo), estirado para cubrir **todo** el lienzo. Si es 0, estirarlo a todo el lienzo (como ya hace). Nunca dejar márgenes.
   - `renderFinal` necesita conocer la orientación del marco: usar `frame.naturalWidth/width` vs `height` de la imagen del marco (no depender del JSON).

2b. **Botón "Girar marco" (a gusto del cliente)**:
   - Estado `state.frameFlip` (booleano, por defecto `false`) que suma 180° a la rotación automática: rotación final = `(frameRotation(...) + (frameFlip ? 180 : 0)) % 360`. Así el marco siempre llena la hoja sin distorsión extra: hoja vertical → 90° o 270°; hoja horizontal → 0° o 180°.
   - Cambiar la firma a `renderFinal(..., frameAngle)` o pasar el ángulo dentro de un objeto de opciones; dibujar con `translate`/`rotate` para 0/90/180/270 de forma general (helper puro `frameDrawTransform(angle, canvasW, canvasH)` → `{tx, ty, rotation, drawW, drawH}`, con prueba unitaria para los 4 ángulos).
   - Botón "↻ Girar marco" en la pantalla Editar (junto a "Centrar") y en la pantalla "Mostrar al cliente" (junto a las flechas). Deshabilitado/oculto cuando está seleccionado "Sin marco".
   - El giro se conserva al cambiar de marco y se reinicia a `false` con "Tomar otra". La vista previa, las miniaturas y la exportación final usan el mismo ángulo.

3. **Mostrar todos los marcos siempre** (`js/frames.js` / `js/app.js`): quitar el filtro por orientación. "Sin marco" sigue siendo el primero. Actualizar la prueba existente que verifica el filtrado para que ahora verifique que se muestran todos y que "Sin marco" va primero.

4. **Miniaturas**: si la foto actual es vertical, mostrar la miniatura del marco girada 90° (para que coincida con la vista previa). Si es complicado con el caché de miniaturas, cachear por `id+rotación`.

5. **Nombres de marcos** (`scripts/build-frames.mjs`): derivar el nombre así: quitar extensión; quitar el prefijo "Marco " (sin distinguir mayúsculas); convertir un sufijo " (N)" en " N+1" (p. ej. "… flores (1)" → "… flores 2"); guiones/guiones bajos → espacios; primera letra en mayúscula, resto como venga. Ejemplo: `Marco festivo mexicano dorado.png` → "Festivo mexicano dorado". Agregar prueba para estos casos.

6. **Regenerar `frames.json`** con `npm run build:frames` (debe listar los 9 marcos, orientación `landscape`).

7. **Service worker** (`sw.js`): subir la versión de caché para que los dispositivos tomen la nueva versión y los nuevos marcos.

8. **Pruebas nuevas** (`tests/index.js`):
   - `printSizePx('carta','portrait')` = 2550×3300, `('carta','landscape')` = 3300×2550, `('tabloide','portrait')` = 2200×3400, `('tabloide','landscape')` = 3400×2200.
   - `frameRotation`: landscape→portrait = 90, landscape→landscape = 0, portrait→landscape = 90, square→cualquiera = 0.
   - `frameDrawTransform` para 0/90/180/270: el área dibujada cubre exactamente el lienzo.
   - Nombres de marcos (paso 5).

9. **README.md**: actualizar sección de marcos: los marcos actuales son horizontales para carta; se estiran a tabloide/4×6 y se giran para fotos verticales; para mejor nitidez en tabloide usar PNG de al menos 3400×2200 px.

## Verificación
1. `npm test` → todas pasan (14 previas + nuevas).
2. `npm run build:frames` → `frames.json` con 9 marcos y nombres limpios.
3. `node --check` en cada archivo de `js/`, `scripts/` y `sw.js`.
4. No hacer commits (la carpeta `.git` puede estar bloqueada para ti); Claude los hará.

## Al terminar
Resumen MUY breve: archivos cambiados, resultado de pruebas, pendientes.
