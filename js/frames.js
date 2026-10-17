import { all, put, remove } from "./storage.js";
import { decode, orientation, reduced } from "./camera.js";
import { frameDrawTransform } from "./compose.js";
export const none = { id: "none", name: "Sin marco" };
const thumbnails = new Map(),
  images = new Map();
export async function loadFrames() {
  let packed = [];
  try {
    const r = await fetch("frames.json");
    if (r.ok) packed = await r.json();
  } catch {}
  return [
    ...packed.map((f) => ({ ...f, source: "packaged" })),
    ...(await all("frames")),
  ];
}
export function matching(frames) {
  return [none, ...frames];
}
export async function frameImage(frame) {
  if (!frame || frame.id === "none") return null;
  if (!images.has(frame.id))
    images.set(
      frame.id,
      (async () => {
        if (frame.blob) return decode(frame.blob);
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => {
            images.delete(frame.id);
            reject(Error("No se pudo cargar el marco"));
          };
          img.src = frame.src;
        });
      })(),
    );
  return images.get(frame.id);
}
export async function thumbnail(frame, angle = 0) {
  if (frame.id === "none") return "";
  const key = `${frame.id}:${angle}`;
  if (!thumbnails.has(key)) {
    const image = reduced(await frameImage(frame), 240);
    const sideways = angle % 180 !== 0;
    const canvas = document.createElement("canvas");
    canvas.width = sideways ? image.height : image.width;
    canvas.height = sideways ? image.width : image.height;
    const ctx = canvas.getContext("2d");
    const t = frameDrawTransform(angle, canvas.width, canvas.height);
    ctx.translate(t.tx, t.ty);
    ctx.rotate(t.rotation);
    ctx.drawImage(image, 0, 0, t.drawW, t.drawH);
    thumbnails.set(key, canvas.toDataURL());
  }
  return thumbnails.get(key);
}
export async function addFrame(file) {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if ([...b].join(",") !== "137,80,78,71,13,10,26,10")
    throw Error("Selecciona un marco PNG");
  const image = await decode(file),
    ctx = image.getContext("2d", { willReadFrequently: true }),
    data = ctx.getImageData(0, 0, image.width, image.height).data;
  let transparent = false;
  for (let i = 3; i < data.length; i += 4)
    if (data[i] < 255) {
      transparent = true;
      break;
    }
  const frame = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.png$/i, "").replace(/[-_]/g, " "),
    blob: file,
    width: image.width,
    height: image.height,
    orientation: orientation(image.width, image.height),
    source: "user",
  };
  await put("frames", frame);
  return { frame, transparent };
}
export async function deleteFrame(id) {
  await remove("frames", id);
  for (const key of thumbnails.keys())
    if (key.startsWith(`${id}:`)) thumbnails.delete(key);
  images.delete(id);
}
