import { MoveInfo, PokemonInput, StatBlock } from "../types";

type JpNameMapFile = {
  p?: Record<string, string>;
  m?: Record<string, string>;
  pokemon?: Record<string, string>;
  move?: Record<string, string>;
};

type CompactPokemonTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number[],
  number[]
];

type OfflinePokemonFile = {
  g?: string;
  tm: string[];
  mm: string[];
  p: Record<string, CompactPokemonTuple>;
};

type CompactMoveTuple = [number | null, number, number];

type OfflineMoveFile = {
  g?: string;
  t: string[];
  c: string[];
  m: Record<string, CompactMoveTuple>;
};

type OfflinePokemonEntry = {
  stats: StatBlock;
  types: string[];
  moves: string[];
};

type OfflineMoveEntry = {
  power: number | null;
  type: string;
  damageClass: MoveInfo["damageClass"];
};

type OfflineData = {
  jpPokemonToApi: Record<string, string>;
  jpMoveToApi: Record<string, string>;
  jpPokemonLookup: Record<string, string>;
  jpMoveLookup: Record<string, string>;
  pokemonByApi: Record<string, OfflinePokemonEntry>;
  moveByApi: Record<string, OfflineMoveEntry>;
  pokemonApiToJp: Record<string, string>;
  moveApiToJp: Record<string, string>;
};

let offlineDataPromise: Promise<OfflineData> | null = null;

function getPokemonNameMap(data: JpNameMapFile): Record<string, string> {
  return data.p ?? data.pokemon ?? {};
}

function getMoveNameMap(data: JpNameMapFile): Record<string, string> {
  return data.m ?? data.move ?? {};
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeJapaneseName(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/[\s\u3000・･]/g, "");
}

function isJapanese(name: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9faf]/.test(name);
}

function emptyStats(): StatBlock {
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}

function defaultIvs(): StatBlock {
  return { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
}

function reverseMap(source: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [jp, api] of Object.entries(source)) {
    if (!out[api]) out[api] = jp;
  }
  return out;
}

function pokemonNameAliases(name: string): string[] {
  const aliases = [name];
  const match = name.match(/^(.+?)[(（]([^()（）]+)[)）]$/);
  if (!match) return aliases;
  const base = match[1].trim();
  const form = match[2].trim();
  aliases.push(`${base}${form}`);
  aliases.push(`${form}${base}`);
  aliases.push(form);
  return aliases;
}

function buildJapaneseLookup(
  source: Record<string, string>,
  aliasBuilder?: (name: string) => string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [jpName, apiName] of Object.entries(source)) {
    const aliases = aliasBuilder ? aliasBuilder(jpName) : [jpName];
    for (const alias of aliases) {
      const key = normalizeJapaneseName(alias);
      if (!key || out[key]) continue;
      out[key] = apiName;
    }
  }
  return out;
}

function decodePokemon(file: OfflinePokemonFile): Record<string, OfflinePokemonEntry> {
  const out: Record<string, OfflinePokemonEntry> = {};
  for (const [api, tuple] of Object.entries(file.p ?? {})) {
    out[api] = {
      stats: {
        hp: tuple[0] ?? 0,
        atk: tuple[1] ?? 0,
        def: tuple[2] ?? 0,
        spa: tuple[3] ?? 0,
        spd: tuple[4] ?? 0,
        spe: tuple[5] ?? 0,
      },
      types: (tuple[6] ?? []).map((i) => file.tm?.[i] ?? "").filter(Boolean),
      moves: (tuple[7] ?? []).map((i) => file.mm?.[i] ?? "").filter(Boolean),
    };
  }
  return out;
}

function decodeMove(file: OfflineMoveFile): Record<string, OfflineMoveEntry> {
  const out: Record<string, OfflineMoveEntry> = {};
  for (const [api, tuple] of Object.entries(file.m ?? {})) {
    out[api] = {
      power: tuple[0] ?? null,
      type: file.t?.[tuple[1] ?? 0] ?? "",
      damageClass: (file.c?.[tuple[2] ?? 0] as MoveInfo["damageClass"]) ?? "",
    };
  }
  return out;
}

async function loadOfflineData(): Promise<OfflineData> {
  if (!offlineDataPromise) {
    offlineDataPromise = Promise.all([
      fetch("/jp-name-map.json", { cache: "no-store" }),
      fetch("/offline-pokemon.json", { cache: "no-store" }),
      fetch("/offline-move.json", { cache: "no-store" }),
    ]).then(async ([mapRes, pokemonRes, moveRes]) => {
      if (!mapRes.ok || !pokemonRes.ok || !moveRes.ok) {
        throw new Error("ローカルデータの読み込みに失敗しました");
      }

      const mapData = (await mapRes.json()) as JpNameMapFile;
      const pokemonData = (await pokemonRes.json()) as OfflinePokemonFile;
      const moveData = (await moveRes.json()) as OfflineMoveFile;

      const pokemonByApi = decodePokemon(pokemonData);
      const moveByApi = decodeMove(moveData);
      const pokemonMap = getPokemonNameMap(mapData);
      const moveMap = getMoveNameMap(mapData);
      const pokemonApiToJp = reverseMap(pokemonMap);
      const moveApiToJp = reverseMap(moveMap);

      return {
        jpPokemonToApi: pokemonMap,
        jpMoveToApi: moveMap,
        jpPokemonLookup: buildJapaneseLookup(pokemonMap, pokemonNameAliases),
        jpMoveLookup: buildJapaneseLookup(moveMap),
        pokemonByApi,
        moveByApi,
        pokemonApiToJp,
        moveApiToJp,
      };
    });
  }
  return offlineDataPromise;
}

async function reloadOfflineData(): Promise<OfflineData> {
  offlineDataPromise = null;
  return loadOfflineData();
}

async function resolvePokemonName(
  name: string
): Promise<{ apiName: string; displayName?: string }> {
  const offline = await loadOfflineData();
  if (!isJapanese(name)) {
    return { apiName: normalizeName(name) };
  }
  const normalized = normalizeJapaneseName(name);
  let apiName = offline.jpPokemonLookup[normalized];
  if (!apiName) {
    const refreshed = await reloadOfflineData();
    apiName = refreshed.jpPokemonLookup[normalized];
  }
  if (!apiName) {
    throw new Error(`日本語名「${name}」はローカルデータにありません`);
  }
  return { apiName, displayName: name.trim() };
}

function resolvePokemonApiKey(
  apiName: string,
  pokemonByApi: Record<string, OfflinePokemonEntry>
): string {
  if (pokemonByApi[apiName]) return apiName;
  const candidates = Object.keys(pokemonByApi).filter((key) =>
    key.startsWith(`${apiName}-`)
  );
  if (candidates.length === 0) return apiName;

  const preferredSuffixes = [
    "normal",
    "standard",
    "ordinary",
    "altered",
    "land",
    "plant",
    "red-striped",
    "male",
    "incarnate",
    "shield",
    "average",
    "midday",
    "solo",
    "baile",
    "disguised",
    "amped",
    "full-belly",
    "single-strike",
    "50",
    "ice",
    "zero",
    "curly",
    "two-segment",
    "family-of-four",
    "green-plumage",
  ];

  for (const suffix of preferredSuffixes) {
    const exact = `${apiName}-${suffix}`;
    if (pokemonByApi[exact]) return exact;
  }
  return [...candidates].sort((a, b) => a.localeCompare(b))[0];
}

async function resolveMoveName(
  name: string
): Promise<{ apiName: string; displayName?: string }> {
  const offline = await loadOfflineData();
  if (!isJapanese(name)) {
    return { apiName: normalizeName(name) };
  }
  const normalized = normalizeJapaneseName(name);
  let apiName = offline.jpMoveLookup[normalized];
  if (!apiName) {
    const refreshed = await reloadOfflineData();
    apiName = refreshed.jpMoveLookup[normalized];
  }
  if (!apiName) {
    throw new Error(`日本語技名「${name}」はローカルデータにありません`);
  }
  return { apiName, displayName: name.trim() };
}

export async function fetchPokemon(name: string): Promise<PokemonInput> {
  const resolved = await resolvePokemonName(name);
  const offline = await loadOfflineData();
  const resolvedApiName = resolvePokemonApiKey(resolved.apiName, offline.pokemonByApi);
  const data = offline.pokemonByApi[resolvedApiName];
  if (!data) {
    throw new Error("ポケモンがローカルデータにありません");
  }
  const jpName =
    resolved.displayName?.trim() ||
    offline.pokemonApiToJp[resolved.apiName] ||
    offline.pokemonApiToJp[resolvedApiName] ||
    "";

  return {
    name: jpName || resolvedApiName,
    displayName: jpName || undefined,
    level: 50,
    types: data.types ?? [],
    stats: data.stats ?? emptyStats(),
    evs: emptyStats(),
    ivs: defaultIvs(),
    nature: "serious",
    item: "",
    moves: (data.moves ?? []).map((moveApi) => offline.moveApiToJp[moveApi] ?? moveApi),
  };
}

export async function fetchMove(name: string): Promise<MoveInfo> {
  const resolved = await resolveMoveName(name);
  const offline = await loadOfflineData();
  const data = offline.moveByApi[resolved.apiName];
  if (!data) {
    throw new Error("技がローカルデータにありません");
  }
  const jpName =
    resolved.displayName?.trim() || offline.moveApiToJp[resolved.apiName] || "";

  return {
    name: jpName || resolved.apiName,
    power: data.power,
    type: data.type ?? "",
    damageClass: data.damageClass ?? "",
  };
}
