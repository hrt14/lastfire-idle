/**
 * 大河の文明の「季節」と「増水」。
 *
 * 仕様書（docs/taiga-civilization.md §3.4 / §3.5）の
 *   春 → 夏 → 雨季 → 収穫期 → 乾季
 * をひとめぐり 12分半で回す。
 *
 * 季節は失敗を強制するものではなく、生産計画を変える要素として使う。
 * どの季節も、何かが速くなり、何かが遅くなる。ぜんぶ止まる季節は作らない。
 *
 * 雨季には川が増水し、対策のない畑は水につかって育ちが止まる。
 * ただし引いたあとの泥は畑を肥やすので、洪水は罰であると同時に次の実りでもある。
 */

import type { ShopState, StoveSpec } from "@/lib/shop";
import { hasEquip, stoveItem } from "@/lib/shop";

export type Season = "spring" | "summer" | "rain" | "harvest" | "dry";

export const SEASONS: Season[] = ["spring", "summer", "rain", "harvest", "dry"];

/** 季節ひとつぶんの長さ（秒）。ひとめぐり 12分半 */
export const SEASON_TIME = 150;

/** 洪水が続く長さ（秒）。排水路があると半分になる */
const FLOOD_TIME = 26;

/** 洪水のあと、畑が肥えているあいだ（秒） */
const RICH_TIME = 150;

export const seasonName: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  rain: "雨季",
  harvest: "収穫期",
  dry: "乾季",
};

export const seasonMark: Record<Season, string> = {
  spring: "🌱",
  summer: "☀️",
  rain: "🌧️",
  harvest: "🌾",
  dry: "🏜️",
};

/** その季節に何が起きるか（長押しやHUDで見せる一言） */
export const seasonNote: Record<Season, string> = {
  spring: "種がよくとれる。畑を増やすなら今",
  summer: "畑はよく育つが、川の水が減る",
  rain: "水が豊富。ただし川があふれることがある",
  harvest: "作物が一斉に実る。運ぶ手が足りなくなる",
  dry: "水が細る。ためておいた水がものを言う",
};

/** 人手を配る職。仕様書 §10.4 の「人口を職業へ配分する」 */
export type Job = "farm" | "craft" | "haul" | "build";

export const JOBS: { id: Job; label: string; note: string }[] = [
  { id: "farm", label: "農と牧", note: "畑・牧草地・家畜の囲いが速くなる" },
  { id: "craft", label: "工房", note: "窯・石臼・パン窯・干し場が速くなる" },
  { id: "haul", label: "運び", note: "はこび手・荷車・船が速くなる" },
  { id: "build", label: "建築", note: "建築係が速くなる" },
];

/** 1人あたりの効き目 */
export const JOB_STEP = 0.12;

/** 町の人 何人ごとに、配れる手がひとつ増えるか */
export const HANDS_PER_POP = 20;

export type TaigaState = {
  /** いまの季節が始まってからの秒数 */
  clock: number;
  season: Season;
  /** ひとめぐりした回数 */
  year: number;
  /** 増水中の残り秒数（0 なら平常） */
  flood: number;
  /** この雨季にもう増水したか */
  flooded: boolean;
  /** 洪水のあと、畑が肥えている残り秒数 */
  rich: number;
  /** 使者が来て、旅が終わったか */
  sailed: boolean;
  /** どの仕事に何人ずつ配っているか */
  jobs: Record<Job, number>;
  /** 描画側が拾う合図 */
  flash: string | null;
};

export const createTaiga = (): TaigaState => ({
  clock: 0,
  season: "spring",
  year: 1,
  flood: 0,
  flooded: false,
  rich: 0,
  sailed: false,
  jobs: { farm: 0, craft: 0, haul: 0, build: 0 },
  flash: null,
});

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toTaiga = (taiga: TaigaState) => ({
  clock: taiga.clock,
  season: taiga.season,
  year: taiga.year,
  flood: taiga.flood,
  flooded: taiga.flooded,
  rich: taiga.rich,
  sailed: taiga.sailed,
  jobs: taiga.jobs,
});

export const fromTaiga = (input: unknown): TaigaState => {
  const taiga = createTaiga();
  if (!input || typeof input !== "object") return taiga;
  const raw = input as Record<string, unknown>;
  taiga.clock = Math.max(0, finite(raw.clock, 0));
  if (typeof raw.season === "string" && SEASONS.includes(raw.season as Season)) {
    taiga.season = raw.season as Season;
  }
  taiga.year = Math.max(1, Math.floor(finite(raw.year, 1)));
  taiga.flood = Math.max(0, finite(raw.flood, 0));
  taiga.flooded = raw.flooded === true;
  taiga.rich = Math.max(0, finite(raw.rich, 0));
  taiga.sailed = raw.sailed === true;
  if (raw.jobs && typeof raw.jobs === "object") {
    const jobs = raw.jobs as Record<string, unknown>;
    for (const job of JOBS) {
      taiga.jobs[job.id] = Math.max(0, Math.floor(finite(jobs[job.id], 0)));
    }
  }
  return taiga;
};

/** 季節がめぐるのは、第2区画（水路の村）を開いてから */
export const taigaLive = (state: ShopState) =>
  state.stageId === "taiga" && state.unlocked.includes("area-1");

/** いまの季節（まだ季節が始まっていないときは春） */
export const season = (state: ShopState): Season =>
  taigaLive(state) ? state.taiga.season : "spring";

/** 次の季節までの残り秒数 */
export const seasonLeft = (state: ShopState) =>
  Math.max(0, SEASON_TIME - state.taiga.clock);

/** いま増水しているか */
export const flooding = (state: ShopState) =>
  taigaLive(state) && state.taiga.flood > 0;

/** 洪水のあとで、畑が肥えているか */
export const fertile = (state: ShopState) =>
  taigaLive(state) && state.taiga.rich > 0;

/** 川の水かさ（0〜1）。見た目に使う */
export const riverRise = (state: ShopState) => {
  if (!taigaLive(state)) return 0;
  const taiga = state.taiga;
  if (taiga.flood > 0) return 1;
  if (taiga.season === "rain") return 0.55;
  if (taiga.season === "dry") return -0.5;
  if (taiga.season === "summer") return -0.25;
  return 0;
};

/** 水を汲む場所か（水くみ場・取水口） */
const isWater = (stove: StoveSpec) => stoveItem(stove) === "water";
/** 畑か */
const isField = (stove: StoveSpec) => stoveItem(stove) === "grain";
/** 種置き場か */
const isSeed = (stove: StoveSpec) => stoveItem(stove) === "seed";

/**
 * その作業場の、いまの進みぐあいの倍率。
 * 季節と増水で変わる。0 を返すとその作業場は止まる。
 */
export const taigaWork = (state: ShopState, stove: StoveSpec) => {
  if (!taigaLive(state)) return 1;
  const taiga = state.taiga;
  let rate = 1;

  switch (taiga.season) {
    case "spring":
      if (isSeed(stove)) rate *= 1.5;
      break;
    case "summer":
      if (isField(stove)) rate *= 1.35;
      // 日照りで川が細る
      if (isWater(stove)) rate *= 0.75;
      break;
    case "rain":
      if (isWater(stove)) rate *= 1.6;
      break;
    case "harvest":
      if (isField(stove)) rate *= 1.6;
      break;
    case "dry":
      if (isWater(stove)) rate *= 0.6;
      if (isField(stove)) rate *= 0.85;
      break;
  }

  if (taiga.flood > 0 && isField(stove)) {
    /*
     * 増水で畑が水につかる。土手を築いてあれば、そのまま育つ。
     * 作物が消える仕様にはしない（仕様書 §6.5）。止まるだけ
     */
    if (!hasEquip(state, "levee")) return 0;
  }
  // 洪水のあとの泥で、しばらく畑がよく育つ
  if (taiga.rich > 0 && isField(stove)) rate *= 1.4;

  // 配った人手のぶん、その系統が速くなる
  const job = jobOf(stove);
  if (job) rate *= jobBonus(state, job);
  // 暮らしの手を残していないと、町ぜんたいが少し鈍る
  if (overworked(state)) rate *= 0.9;
  return rate;
};

/* ---------- 人手の配りかた（仕様書 §10.4） ---------- */

/** 割りふれる人手の数（町が育つほど増える） */
export const handCount = (state: ShopState) =>
  state.stageId === "taiga" ? Math.floor(townPop(state) / HANDS_PER_POP) : 0;

/** いま配っている数の合計 */
export const handsUsed = (state: ShopState) =>
  JOBS.reduce((sum, job) => sum + (state.taiga.jobs[job.id] ?? 0), 0);

/** まだ配っていない人手。ここが 0 だと暮らしが回らなくなる */
export const handsLeft = (state: ShopState) =>
  Math.max(0, handCount(state) - handsUsed(state));

/** 人手の割りふりを使えるか（町づくりに入ってから） */
export const jobsOpen = (state: ShopState) =>
  state.stageId === "taiga" && state.unlocked.includes("area-5");

/**
 * 人手を全部仕事に出すと、暮らしの手が足りなくなる（仕様書 §10.4）。
 * ぜんぶの作業場が少し遅くなる。1人でも残していれば起きない
 */
export const overworked = (state: ShopState) =>
  jobsOpen(state) && handCount(state) > 0 && handsLeft(state) === 0;

/** その仕事に配った人手のぶんの倍率 */
export const jobBonus = (state: ShopState, job: Job) => {
  if (!jobsOpen(state)) return 1;
  return 1 + (state.taiga.jobs[job] ?? 0) * JOB_STEP;
};

/** 人手を1人動かす。戻り値は動かせたかどうか */
export const moveHand = (state: ShopState, job: Job, delta: number) => {
  if (!jobsOpen(state)) return false;
  const now = state.taiga.jobs[job] ?? 0;
  if (delta > 0 && handsLeft(state) <= 0) return false;
  if (delta < 0 && now <= 0) return false;
  state.taiga.jobs[job] = Math.max(0, now + delta);
  return true;
};

/** その作業場が、どの仕事の受け持ちか */
const jobOf = (stove: StoveSpec): Job | null => {
  const item = stoveItem(stove);
  if (item === "grain" || item === "grass" || item === "milk" || item === "wool") {
    return "farm";
  }
  if (item === "pot" || item === "flour" || item === "bread" || item === "dried") {
    return "craft";
  }
  return null;
};

/** 運ぶ人・建築係にかかる倍率 */
export const taigaCrew = (state: ShopState, kind: string) => {
  if (!jobsOpen(state)) return 1;
  if (kind === "waiter" || kind === "robot" || kind === "boat") {
    return jobBonus(state, "haul");
  }
  if (kind === "builder") return jobBonus(state, "build");
  return 1;
};

/** 歩く速さの倍率（増水中はぬかるむ） */
export const taigaMove = (state: ShopState) =>
  flooding(state) && !hasEquip(state, "levee") ? 0.82 : 1;

const toast = (state: ShopState, text: string) => {
  state.toast = { text, at: Date.now() };
};

/**
 * 町がどこまで育ったか。仕様書 §10.5 の完成条件のうち、
 * 数で言えるものをここで数える（人口・畑の数・建てた建物）。
 */
export const townPop = (state: ShopState) => {
  if (state.stageId !== "taiga") return 0;
  // 席に来る住民と、雇った人と、建った建物に住む人
  const seats = state.unlocked.filter((id) => id.startsWith("seat-")).length;
  const hires = state.unlocked.filter((id) =>
    /^(waiter|farmer|collector|robot|gateman|logger|splitter|digger|potter|miller|baker|mower|herder|shearer|fisher|drier|builder|trader|elder)/.test(
      id,
    ),
  ).length;
  const built = state.built.length;
  return seats * 3 + hires * 2 + built * 6;
};

/** 開いている畑の数 */
export const fieldCount = (state: ShopState) =>
  state.unlocked.filter((id) => id.startsWith("field-")).length;

/**
 * 町の完成に届いた印。
 * 満たすと unlocked に入り、最後の大型交易船の枠がここにぶら下がる。
 */
export const TOWN_POP = 80;

/** 町の完成に要る建物（仕様書 §10.5） */
export const TOWN_BUILDS = [
  { id: "build-granary", label: "大型穀物庫" },
  { id: "build-well", label: "公共井戸" },
  { id: "build-temple", label: "記念塔" },
];

const TAIGA_MARKS: { id: string; reach: (state: ShopState) => boolean }[] = [
  { id: "mark-town-pop", reach: (state) => townPop(state) >= TOWN_POP },
  { id: "mark-fields-5", reach: (state) => fieldCount(state) >= 5 },
  { id: "mark-year-2", reach: (state) => state.taiga.year >= 2 },
  /*
   * 町の完成。ここまで来てはじめて、上流へ出す船を組める。
   * 人が集まり、畑がそろい、公共の建物が建っていること
   */
  {
    id: "mark-town-done",
    reach: (state) =>
      townPop(state) >= TOWN_POP &&
      fieldCount(state) >= 5 &&
      TOWN_BUILDS.every((item) => state.built.includes(item.id)),
  },
];

export const TAIGA_MARK_IDS = TAIGA_MARKS.map((mark) => mark.id);

/** 1フレームぶん進める。季節 → 増水 → 印、の順に見る */
export const updateTaiga = (state: ShopState, dt: number) => {
  if (state.stageId !== "taiga") return;
  const taiga = state.taiga;
  taiga.flash = null;

  for (const mark of TAIGA_MARKS) {
    if (state.unlocked.includes(mark.id)) continue;
    if (!mark.reach(state)) continue;
    state.unlocked.push(mark.id);
  }

  if (!taigaLive(state)) return;

  if (taiga.rich > 0) taiga.rich = Math.max(0, taiga.rich - dt);

  if (taiga.flood > 0) {
    taiga.flood = Math.max(0, taiga.flood - dt);
    if (taiga.flood === 0) {
      // 引いたあとの泥が畑を肥やす
      taiga.rich = RICH_TIME;
      taiga.flash = "ebb";
      toast(state, "水が引いた。泥が畑を肥やしている（しばらく実りが増える）");
    }
  }

  taiga.clock += dt;
  if (taiga.clock >= SEASON_TIME) {
    taiga.clock -= SEASON_TIME;
    const next = SEASONS[(SEASONS.indexOf(taiga.season) + 1) % SEASONS.length];
    taiga.season = next;
    if (next === "spring") taiga.year += 1;
    taiga.flooded = false;
    taiga.flash = "season";
    toast(state, `${seasonMark[next]} ${seasonName[next]}になった ― ${seasonNote[next]}`);
  }

  // 雨季のなかばに、一度だけ川があふれる
  if (
    taiga.season === "rain" &&
    !taiga.flooded &&
    taiga.clock >= SEASON_TIME * 0.45
  ) {
    taiga.flooded = true;
    taiga.flood = hasEquip(state, "drain") ? FLOOD_TIME / 2 : FLOOD_TIME;
    taiga.flash = "flood";
    toast(
      state,
      hasEquip(state, "levee")
        ? "川があふれた。土手が畑を守っている"
        : "川があふれた。畑が水につかっている（土手を築くと止まらない）",
    );
  }
};

/** 大型交易船が建ったときの、旅の終わり */
export const taigaSail = (state: ShopState) => {
  if (state.taiga.sailed) return;
  state.taiga.sailed = true;
  state.taiga.flash = "sail";
  toast(state, "上流から使者が来た ― 「大河の文明」の旅はここまで");
};
