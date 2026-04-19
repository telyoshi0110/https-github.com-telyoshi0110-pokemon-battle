import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 12;

function normalizeJapaneseName(name) {
  return name.trim().replace(/\s|\u3000|・/g, "");
}

async function fetchList(resource) {
  const res = await fetch(`${API_BASE}/${resource}?limit=100000`);
  if (!res.ok) {
    throw new Error(`Failed to fetch list: ${resource}`);
  }
  const data = await res.json();
  return data.results ?? [];
}

async function buildMap(resource) {
  const entries = await fetchList(resource);
  const out = {};
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const current = entries[cursor++];
      const res = await fetch(current.url);
      if (!res.ok) continue;
      const data = await res.json();
      const names = data.names ?? [];
      for (const entry of names) {
        const lang = entry?.language?.name;
        if (lang !== "ja" && lang !== "ja-Hrkt") continue;
        const jp = normalizeJapaneseName(entry.name ?? "");
        if (!jp) continue;
        out[jp] = data.name ?? current.name;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  return out;
}

async function main() {
  const pokemon = await buildMap("pokemon-species");
  const move = await buildMap("move");

  const payload = {
    generatedAt: new Date().toISOString(),
    pokemon,
    move,
  };

  const target = path.resolve(process.cwd(), "public", "jp-name-map.json");
  await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Generated: ${target}`);
  console.log(`Pokemon map: ${Object.keys(pokemon).length}`);
  console.log(`Move map: ${Object.keys(move).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
