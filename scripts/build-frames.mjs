import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
export function frameName(file) {
  return file
    .replace(/\.[^.]+$/, "")
    .replace(/^Marco /i, "")
    .replace(/ \((\d+)\)$/, (_, n) => ` ${Number(n) + 1}`)
    .replace(/[-_]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
export async function buildFrames(
  directory = "Marcos",
  output = "frames.json",
) {
  let files;
  try {
    files = await readdir(directory);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    files = [];
  }
  const result = [];
  for (const file of files.sort().filter((f) => /\.png$/i.test(f))) {
    const b = await readFile(path.join(directory, file));
    if (
      b.length < 33 ||
      b.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      b.toString("ascii", 12, 16) !== "IHDR"
    )
      throw Error(`PNG inválido: ${file}`);
    const width = b.readUInt32BE(16),
      height = b.readUInt32BE(20);
    if (!width || !height) throw Error(`Dimensiones inválidas: ${file}`);
    result.push({
      id: `pack-${file}`,
      name: frameName(file),
      src: `Marcos/${encodeURIComponent(file)}`,
      width,
      height,
      orientation:
        width === height ? "square" : width > height ? "landscape" : "portrait",
    });
  }
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await buildFrames();
