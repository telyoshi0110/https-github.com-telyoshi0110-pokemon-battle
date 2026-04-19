import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 12;

function normalizeJapaneseName(name) {
  return name.trim().replace(/\s|\u3000|・/g, "");
}

function reverseMap(source) {
  const out = {};
  for (const [jp, api] of Object.entries(source)) {
    if (!out[api]) out[api] = jp;
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url}`);
  return res.json();
}

async function fetchList(resource) {
  const data = await fetchJson(`${API_BASE}/${resource}?limit=100000`);
  return data.results ?? [];
}

async function runWorkers(entries, workerFn) {
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const current = entries[cursor++];
      await workerFn(current);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

function statFromApi(stats) {
  const out = [0, 0, 0, 0, 0, 0];
  for (const item of stats ?? []) {
    const key = item?.stat?.name;
    const value = item?.base_stat ?? 0;
    if (key === "hp") out[0] = value;
    if (key === "attack") out[1] = value;
    if (key === "defense") out[2] = value;
    if (key === "special-attack") out[3] = value;
    if (key === "special-defense") out[4] = value;
    if (key === "speed") out[5] = value;
  }
  return out;
}

async function main() {
  const generatedAt = new Date().toISOString();

  const pokemonList = await fetchList("pokemon");
  const moveList = await fetchList("move");
  const speciesList = await fetchList("pokemon-species");
  const formList = await fetchList("pokemon-form");

  const rawPokemon = {};
  const rawMove = {};
  const jpPokemonMap = {};
  const jpMoveMap = {};

  await runWorkers(pokemonList, async (entry) => {
    const data = await fetchJson(entry.url);
    const apiName = data.name ?? entry.name;
    const types = (data.types ?? []).map((t) => t?.type?.name).filter(Boolean);
    const moves = Array.from(new Set((data.moves ?? []).map((m) => m?.move?.name).filter(Boolean)));

    rawPokemon[apiName] = {
      s: statFromApi(data.stats ?? []),
      t: types,
      m: moves,
    };
  });

  await runWorkers(moveList, async (entry) => {
    const data = await fetchJson(entry.url);
    const apiName = data.name ?? entry.name;
    const names = data.names ?? [];
    for (const n of names) {
      const lang = n?.language?.name;
      if (lang !== "ja" && lang !== "ja-Hrkt") continue;
      const normalized = normalizeJapaneseName(n?.name ?? "");
      if (normalized) {
        jpMoveMap[normalized] = apiName;
      }
    }

    rawMove[apiName] = {
      p: data.power ?? null,
      t: data.type?.name ?? "",
      c: data.damage_class?.name ?? "",
    };
  });

  await runWorkers(speciesList, async (entry) => {
    const data = await fetchJson(entry.url);
    const apiName = data.name ?? entry.name;
    const names = data.names ?? [];
    for (const n of names) {
      const lang = n?.language?.name;
      if (lang !== "ja" && lang !== "ja-Hrkt") continue;
      const normalized = normalizeJapaneseName(n?.name ?? "");
      if (normalized) {
        jpPokemonMap[normalized] = apiName;
      }
    }
  });

  await runWorkers(formList, async (entry) => {
    const data = await fetchJson(entry.url);
    const apiName = data?.pokemon?.name ?? entry.name;
    const names = data.names ?? [];
    for (const n of names) {
      const lang = n?.language?.name;
      if (lang !== "ja" && lang !== "ja-Hrkt") continue;
      const normalized = normalizeJapaneseName(n?.name ?? "");
      if (normalized) {
        jpPokemonMap[normalized] = apiName;
      }
    }
  });

  const apiToJp = reverseMap(jpPokemonMap);
  const regionSuffixJa = {
    alola: "アローラ",
    galar: "ガラル",
    hisui: "ヒスイ",
    paldea: "パルデア",
  };

  for (const apiName of Object.keys(rawPokemon)) {
    const parts = apiName.split("-");
    if (parts.length < 2) continue;
    const baseApi = parts[0];
    const suffix = parts[1];
    const baseJp = apiToJp[baseApi];
    if (!baseJp) continue;

    const regionName = regionSuffixJa[suffix];
    if (regionName) {
      jpPokemonMap[normalizeJapaneseName(`${regionName}${baseJp}`)] = apiName;
      jpPokemonMap[normalizeJapaneseName(`${baseJp}(${regionName})`)] = apiName;
    }

    if (baseApi === "rotom") {
      const rotomFormJa = {
        heat: "ヒートロトム",
        wash: "ウォッシュロトム",
        frost: "フロストロトム",
        fan: "スピンロトム",
        mow: "カットロトム",
      };
      if (rotomFormJa[suffix]) {
        jpPokemonMap[normalizeJapaneseName(rotomFormJa[suffix])] = apiName;
      }
    }
  }

  const typeSet = new Set();
  const moveSet = new Set();
  for (const p of Object.values(rawPokemon)) {
    for (const t of p.t) typeSet.add(t);
    for (const m of p.m) moveSet.add(m);
  }
  for (const m of Object.values(rawMove)) {
    if (m.t) typeSet.add(m.t);
  }

  const typeList = Array.from(typeSet).sort();
  const moveListAll = Array.from(moveSet).sort();
  const classList = ["", "physical", "special", "status"];

  const typeId = Object.fromEntries(typeList.map((v, i) => [v, i]));
  const moveId = Object.fromEntries(moveListAll.map((v, i) => [v, i]));
  const classId = Object.fromEntries(classList.map((v, i) => [v, i]));

  const compactPokemon = {};
  for (const [api, p] of Object.entries(rawPokemon)) {
    compactPokemon[api] = [
      p.s[0],
      p.s[1],
      p.s[2],
      p.s[3],
      p.s[4],
      p.s[5],
      p.t.map((v) => typeId[v]),
      p.m.map((v) => moveId[v]),
    ];
  }

  const compactMove = {};
  for (const [api, m] of Object.entries(rawMove)) {
    compactMove[api] = [m.p, typeId[m.t] ?? 0, classId[m.c] ?? 0];
  }

  const outDir = path.resolve(process.cwd(), "public");

  await fs.writeFile(
    path.join(outDir, "offline-pokemon.json"),
    `${JSON.stringify({ g: generatedAt, tm: typeList, mm: moveListAll, p: compactPokemon })}\n`,
    "utf8"
  );

  await fs.writeFile(
    path.join(outDir, "offline-move.json"),
    `${JSON.stringify({ g: generatedAt, t: typeList, c: classList, m: compactMove })}\n`,
    "utf8"
  );

  await fs.writeFile(
    path.join(outDir, "jp-name-map.json"),
    `${JSON.stringify({ p: jpPokemonMap, m: jpMoveMap })}\n`,
    "utf8"
  );

  console.log(`Generated at ${generatedAt}`);
  console.log(`Pokemon entries: ${Object.keys(compactPokemon).length}`);
  console.log(`Move entries: ${Object.keys(compactMove).length}`);
  console.log(`JP Pokemon map: ${Object.keys(jpPokemonMap).length}`);
  console.log(`JP Move map: ${Object.keys(jpMoveMap).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
