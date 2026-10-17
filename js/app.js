import { defaults } from "./adjust.js";
import { decode, reduced, orientation, isBlank } from "./camera.js";
import {
  loadFrames,
  matching,
  frameImage,
  thumbnail,
  addFrame,
  deleteFrame,
} from "./frames.js";
import { all, put, remove, preferences } from "./storage.js";
import { buildCalibrationMap } from "./vignette.js";
import {
  printSizePx,
  renderFinal,
  jpeg,
  filename,
  coverTransform,
  frameRotation,
} from "./compose.js";
import { save, share } from "./share.js";
const $ = (id) => document.getElementById(id),
  state = {
    screen: "home",
    frames: [],
    photo: null,
    small: null,
    selected: "none",
    frameFlip: false,
    params: { ...defaults },
    transform: { panX: 0, panY: 0, zoom: 1 },
    maps: [],
    prefs: preferences(),
    correct: false,
    intensity: 0.7,
  };
if (!["carta", "tabloide", "4x6", "5x7", "6x8"].includes(state.prefs.size))
  state.prefs.size = "carta";
let previousScreen = "home",
  calibrationTarget,
  exportFile,
  resultURL,
  wake,
  renderTimer,
  renderVersion = 0,
  toastTimer;
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 6500);
}
function safe(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      toast(e.message || "Algo falló. Intenta de nuevo.");
    }
  };
}
function photoOrientation() {
  return orientation(state.photo.width, state.photo.height) === "landscape"
    ? "landscape"
    : "portrait";
}
function frameAngle(frame) {
  if (!frame) return 0;
  const imageOrientation = orientation(
    frame.naturalWidth || frame.width,
    frame.naturalHeight || frame.height,
  );
  return (
    (frameRotation(imageOrientation, photoOrientation()) +
      (state.frameFlip ? 180 : 0)) %
    360
  );
}
function syncFrameButtons() {
  for (const id of ["rotateFrame", "rotateCustomerFrame"])
    $(id).disabled = state.selected === "none";
}
function choices() {
  return matching(state.frames);
}
function currentMap() {
  return state.maps.find((m) => m.id === photoOrientation());
}
async function wakeLock() {
  try {
    if (
      ["edit", "customer"].includes(state.screen) &&
      document.visibilityState === "visible"
    ) {
      if (!wake || wake.released)
        wake = await navigator.wakeLock?.request("screen");
    } else {
      await wake?.release();
      wake = null;
    }
  } catch {}
}
function navigate(screen) {
  state.screen = screen;
  for (const id of ["home", "edit", "customer", "final", "config"])
    $(id).hidden = id !== screen;
  $("settings").hidden = screen === "customer" || screen === "config";
  void wakeLock();
  if (screen === "edit" || screen === "customer") schedule();
}
document.addEventListener("visibilitychange", wakeLock);
function schedule() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(
    () => requestAnimationFrame(() => safe(render)()),
    80,
  );
}
// Si el navegador borró la foto de memoria (pasa en Android), recargarla del archivo original.
async function ensurePhoto(full = false) {
  if (!state.file || (!isBlank(state.small) && !(full && isBlank(state.photo)))) return;
  state.photo = await decode(state.file);
  state.small = reduced(state.photo);
}
async function render() {
  if (!state.photo) return;
  await ensurePhoto();
  if (!state.photo) return;
  const version = ++renderVersion,
    frame = await frameImage(state.frames.find((f) => f.id === state.selected));
  if (version !== renderVersion) return;
  const size = printSizePx(state.prefs.size, photoOrientation()),
    scale = Math.min(1, 1000 / Math.max(size.width, size.height));
  const c = renderFinal(
    state.small,
    state.params,
    state.correct ? currentMap() : null,
    frame,
    {
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
    },
    state.transform,
    state.intensity,
    frameAngle(frame),
  );
  for (const id of ["preview", "customerPreview"]) {
    const target = $(id);
    target.width = c.width;
    target.height = c.height;
    target.getContext("2d").drawImage(c, 0, 0);
  }
  $("frameName").textContent =
    choices().find((f) => f.id === state.selected)?.name || "Sin marco";
}
let framesVersion = 0;
async function renderFrames() {
  syncFrameButtons();
  const version = ++framesVersion;
  const holder = $("frames");
  holder.replaceChildren();
  for (const f of choices()) {
    if (version !== framesVersion) return;
    const b = document.createElement("button");
    b.textContent = f.name;
    b.setAttribute("aria-pressed", String(f.id === state.selected));
    b.onclick = () => {
      state.selected = f.id;
      void renderFrames();
      schedule();
    };
    holder.append(b);
    if (f.id !== "none") {
      try {
        const img = new Image();
        img.alt = "";
        img.src = await thumbnail(f, frameAngle(await frameImage(f)));
        b.prepend(img);
      } catch {}
    }
  }
  if (!state.frames.length) toast("Puedes agregar marcos desde Ajustes.");
}
function syncControls() {
  for (const key of [
    "brightness",
    "contrast",
    "saturation",
    "temperature",
    "sharpness",
  ])
    $(key).value = state.params[key];
  for (const b of $("filters").children)
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.filter === state.params.filter),
    );
  $("auto").setAttribute("aria-pressed", String(state.params.auto));
  const available = !!currentMap();
  $("correct").disabled = !available;
  $("correct").checked = available && state.correct;
  $("intensity").disabled = !available;
  $("intensity").value = state.intensity * 100;
  $("calibrationHint").textContent = available
    ? "Calibración disponible"
    : "Calibra para esta orientación";
}
async function openPhoto(file) {
  if (!file) return;
  const photo = await decode(file);
  state.file = file;
  state.photo = photo;
  state.small = reduced(photo);
  state.selected = "none";
  state.frameFlip = false;
  state.params = { ...defaults };
  state.transform = { panX: 0, panY: 0, zoom: 1 };
  state.correct = false;
  syncControls();
  await renderFrames();
  navigate("edit");
}
for (const [button, input] of [
  ["take", "cameraInput"],
  ["gallery", "galleryInput"],
]) {
  $(button).onclick = () => $(input).click();
  $(input).onchange = safe(async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    await openPhoto(f);
  });
}
for (const [key, label] of [
  ["brightness", "Brillo"],
  ["contrast", "Contraste"],
  ["saturation", "Saturación"],
  ["temperature", "Temperatura"],
  ["sharpness", "Nitidez"],
]) {
  const l = document.createElement("label");
  l.textContent = label;
  const input = document.createElement("input");
  Object.assign(input, {
    type: "range",
    id: key,
    min: key === "sharpness" ? "0" : "-100",
    max: "100",
    value: "0",
  });
  input.oninput = () => {
    state.params[key] = Number(input.value);
    schedule();
  };
  l.append(input);
  $("sliders").append(l);
}
for (const [filter, label] of [
  ["natural", "Natural"],
  ["vivo", "Vivo"],
  ["calido", "Cálido"],
  ["frio", "Frío"],
  ["bn", "B/N"],
  ["sepia", "Sepia"],
]) {
  const b = document.createElement("button");
  b.textContent = label;
  b.dataset.filter = filter;
  b.onclick = () => {
    state.params.filter = filter;
    syncControls();
    schedule();
  };
  $("filters").append(b);
}
$("auto").onclick = () => {
  state.params.auto = !state.params.auto;
  syncControls();
  schedule();
};
$("reset").onclick = () => {
  state.params = { ...defaults };
  state.correct = false;
  state.intensity = 0.7;
  syncControls();
  schedule();
};
$("correct").onchange = (e) => {
  state.correct = e.target.checked;
  schedule();
};
$("intensity").oninput = (e) => {
  state.intensity = Number(e.target.value) / 100;
  schedule();
};
$("center").onclick = () => {
  state.transform = { panX: 0, panY: 0, zoom: 1 };
  schedule();
};
for (const id of ["rotateFrame", "rotateCustomerFrame"])
  $(id).onclick = () => {
    state.frameFlip = !state.frameFlip;
    void renderFrames();
    schedule();
  };
const pointers = new Map();
let pinch;
function distance() {
  const p = [...pointers.values()];
  return p.length === 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
}
$("preview").onpointerdown = (e) => {
  e.target.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  pinch = distance();
};
$("preview").onpointermove = (e) => {
  const old = pointers.get(e.pointerId);
  if (!old) return;
  const rect = e.target.getBoundingClientRect();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const d = distance();
    if (pinch)
      state.transform.zoom = Math.max(
        1,
        Math.min(4, (state.transform.zoom * d) / pinch),
      );
    pinch = d;
  } else {
    state.transform.panX += (e.clientX - old.x) / rect.width;
    state.transform.panY += (e.clientY - old.y) / rect.height;
  }
  const t = coverTransform(
    state.photo.width,
    state.photo.height,
    e.target.width,
    e.target.height,
    state.transform,
  );
  state.transform.panX =
    (t.x - (e.target.width - t.width) / 2) / e.target.width;
  state.transform.panY =
    (t.y - (e.target.height - t.height) / 2) / e.target.height;
  schedule();
};
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("preview").addEventListener(event, (e) => {
    pointers.delete(e.pointerId);
    pinch = distance();
  });
$("preview").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    state.transform.zoom = Math.max(
      1,
      Math.min(4, state.transform.zoom * Math.exp(-e.deltaY * 0.001)),
    );
    schedule();
  },
  { passive: false },
);
$("client").onclick = async () => {
  navigate("customer");
  try {
    await $("customer").requestFullscreen?.();
  } catch {}
};
$("exitCustomer").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {}
  navigate("edit");
  void renderFrames();
};
function cycle(delta) {
  const list = choices(),
    i = list.findIndex((f) => f.id === state.selected);
  state.selected = list[(i + delta + list.length) % list.length].id;
  syncFrameButtons();
  schedule();
}
$("previous").onclick = () => cycle(-1);
$("next").onclick = () => cycle(1);
let swipeX;
$("customerPreview").onpointerdown = (e) => (swipeX = e.clientX);
$("customerPreview").onpointerup = (e) => {
  if (Math.abs(e.clientX - swipeX) > 40) cycle(e.clientX > swipeX ? -1 : 1);
};
$("done").onclick = safe(async () => {
  const b = $("done");
  b.disabled = true;
  b.textContent = "Preparando…";
  try {
    await ensurePhoto(true);
    const frame = await frameImage(
        state.frames.find((f) => f.id === state.selected),
      ),
      size = printSizePx(state.prefs.size, photoOrientation());
    let blob;
    try {
      blob = await jpeg(
        renderFinal(
          state.photo,
          state.params,
          state.correct ? currentMap() : null,
          frame,
          size,
          state.transform,
          state.intensity,
          frameAngle(frame),
        ),
      );
    } catch {
      toast("Reduciendo resolución para completar la foto…");
      blob = await jpeg(
        renderFinal(
          reduced(
            state.photo,
            Math.max(state.photo.width, state.photo.height) * 0.75,
          ),
          state.params,
          state.correct ? currentMap() : null,
          frame,
          {
            width: Math.round(size.width * 0.75),
            height: Math.round(size.height * 0.75),
          },
          state.transform,
          state.intensity,
          frameAngle(frame),
        ),
      );
    }
    exportFile = new File([blob], filename(), { type: "image/jpeg" });
    if (resultURL) URL.revokeObjectURL(resultURL);
    resultURL = URL.createObjectURL(blob);
    $("result").src = resultURL;
    navigate("final");
  } finally {
    b.disabled = false;
    b.textContent = "Listo";
  }
});
$("save").onclick = () => exportFile && save(exportFile);
$("share").onclick = safe(async () => {
  if (exportFile && (await share(exportFile)) === "downloaded")
    toast("Foto guardada. Ábrela para compartir por WhatsApp o imprimir.");
});
$("backEdit").onclick = () => navigate("edit");
$("another").onclick = () => {
  renderVersion++;
  clearTimeout(renderTimer);
  state.photo = state.small = state.file = null;
  state.frameFlip = false;
  exportFile = null;
  if (resultURL) URL.revokeObjectURL(resultURL);
  resultURL = null;
  $("result").removeAttribute("src");
  for (const id of ["preview", "customerPreview"]) {
    $(id).width = 1;
    $(id).height = 1;
  }
  pointers.clear();
  navigate("home");
};
async function config() {
  $("size").value = state.prefs.size || "carta";
  $("calibrations").replaceChildren();
  for (const [id, name] of [
    ["portrait", "vertical"],
    ["landscape", "horizontal"],
  ]) {
    const row = document.createElement("div");
    row.className = "row";
    const b = document.createElement("button");
    b.textContent = `Calibrar ${name}${state.maps.some((m) => m.id === id) ? " ✓" : ""}`;
    b.onclick = () => {
      calibrationTarget = id;
      $("calibrationInput").click();
    };
    const del = document.createElement("button");
    del.textContent = `Borrar ${name}`;
    del.disabled = !state.maps.some((m) => m.id === id);
    del.onclick = safe(async () => {
      await remove("calibration", id);
      state.maps = state.maps.filter((m) => m.id !== id);
      await config();
    });
    row.append(b, del);
    $("calibrations").append(row);
  }
  $("userFrames").replaceChildren();
  for (const f of state.frames.filter((f) => f.source === "user")) {
    const row = document.createElement("div"),
      b = document.createElement("button");
    row.className = "row";
    const name = document.createElement("span");
    name.textContent = f.name;
    b.textContent = "Eliminar";
    b.onclick = safe(async () => {
      await deleteFrame(f.id);
      state.frames = state.frames.filter((x) => x.id !== f.id);
      if (state.selected === f.id) state.selected = "none";
      await config();
    });
    row.append(name, b);
    $("userFrames").append(row);
  }
}
$("settings").onclick = safe(async () => {
  if (state.screen === "config") return;
  previousScreen = state.screen;
  await config();
  navigate("config");
});
$("closeSettings").onclick = safe(async () => {
  const target = previousScreen === "config" ? "home" : previousScreen;
  if (state.photo) syncControls();
  navigate(state.photo || target === "home" ? target : "home");
  if (state.photo) await renderFrames();
});
$("size").onchange = (e) => {
  state.prefs.size = e.target.value;
  preferences(state.prefs);
};
$("addFrames").onclick = () => $("frameInput").click();
$("frameInput").onchange = safe(async (e) => {
  for (const file of e.target.files) {
    try {
      const { frame, transparent } = await addFrame(file);
      state.frames.push(frame);
      if (!transparent)
        toast("Marco agregado, pero no tiene transparencia y cubrirá la foto.");
    } catch (err) {
      toast(err.message);
    }
  }
  e.target.value = "";
  await config();
});
$("calibrationInput").onchange = safe(async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const photo = await decode(file);
  if (orientation(photo.width, photo.height) !== calibrationTarget)
    throw Error(
      "Gira el dispositivo y toma la calibración con la orientación elegida.",
    );
  const small = reduced(photo, 256),
    map = {
      ...buildCalibrationMap(
        small.getContext("2d").getImageData(0, 0, small.width, small.height),
      ),
      id: calibrationTarget,
    };
  await put("calibration", map);
  state.maps = state.maps.filter((m) => m.id !== map.id).concat(map);
  await config();
  toast("Calibración guardada");
});
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  toast(e.reason?.message || "No se pudo completar la operación");
});
async function init() {
  state.frames = await loadFrames();
  state.maps = await all("calibration");
  if ("serviceWorker" in navigator)
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch {}
}
void safe(init)();
