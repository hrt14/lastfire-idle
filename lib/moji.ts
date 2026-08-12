/**
 * 文字のはじまり ―― 「記録」と「混乱」。
 *
 * 仕様書（docs/moji-writing.md §3 / §4 / §10）の中身をここに置く。
 *
 * このステージの新しさは「情報物流」ひとつ。
 * 物を運ぶ流れ（麦・粘土・羊毛）の上に、
 * 記録を運ぶ流れ（生板 → 乾板 → 記録板 → 記録庫）を重ねる。
 *
 * 街が大きくなるほど「憶えきれない」ことが増える（＝混乱）。
 * 混乱は罰ではなく、次に何を買えばいいかの合図として出す。
 * 書記を増やし、記録庫を建て、文字の段階を上げると静かになっていく。
 */

import type { ShopState, StoveSpec } from "@/lib/shop";
import { openSeats, openStoves, stoveHasCook, stoveItem } from "@/lib/shop";

/* ==================== 情報の品 ==================== */

/**
 * 情報物流に乗る品。物資と同じように「持って運ぶ」ものとして扱う
 * （仕様書 §15「情報物流は物資と同じ見せ方を基本にする」）。
 */
export const RECORD_ITEMS = [
  "tally",
  "rawtab",
  "drytab",
  "tablet",
  "deed",
  "landtab",
  "taxtab",
] as const;

export type RecordItem = (typeof RECORD_ITEMS)[number];

export const isRecordItem = (kind: string): kind is RecordItem =>
  (RECORD_ITEMS as readonly string[]).includes(kind);

/**
 * 記録として数える品と、その重み。
 *
 * 数量札は「数を線で残しただけ」でも、立派に最初の記録
 * （仕様書 §4 の段階1「数える印」そのもの）。
 * 生板・乾板はまだ何も書いていないので数えない。
 */
const WRITTEN: Record<string, number> = {
  tally: 1,
  tablet: 3,
  deed: 6,
  landtab: 6,
  taxtab: 6,
};

/* ==================== 文字発展ツリー ==================== */

export type Tech = {
  level: number;
  id: string;
  /** 段階の名前 */
  name: string;
  /** 「文字Lv.4」ではなく、意味で見せる一言（仕様書 §13） */
  means: string;
  /** ゲーム効果の説明 */
  effect: string;
  /** ここまで記録が貯まると上がる */
  records: number;
  /** これを開いていないと上がらない（買い物と足並みをそろえる） */
  needs?: string;
};

/**
 * 0 記録以前 → 7 法。
 * 記録の総数と、区画の進みの両方で上がる。
 * どちらか片方だけ進めても先へ行けないので、街と文字がいっしょに育つ。
 */
export const TECHS: Tech[] = [
  {
    level: 0,
    id: "tech-none",
    name: "記録以前",
    means: "まだ何も書き残せない",
    effect: "憶えているうちに運ぶしかない",
    records: 0,
  },
  {
    level: 1,
    id: "tech-tally",
    name: "数える印",
    means: "数をそのまま残せるようになった",
    effect: "取りちがえが減り、作業場が 8%速くなる",
    records: 6,
  },
  {
    level: 2,
    id: "tech-sign",
    name: "物の記号",
    means: "麦と羊と壺を、書き分けられるようになった",
    effect: "市場が広がり、人が 1.2倍集まる",
    records: 30,
    needs: "area-1",
  },
  {
    level: 3,
    id: "tech-name",
    name: "人の名前",
    means: "だれの仕事かを、書き残せるようになった",
    effect: "担当のいる作業場が 15%速くなる",
    records: 90,
    needs: "area-2",
  },
  {
    level: 4,
    id: "tech-land",
    name: "土地の記録",
    means: "畑の境目を、書き残せるようになった",
    effect: "畑と粘土場が 25%速くなる",
    records: 220,
    needs: "area-2",
  },
  {
    level: 5,
    id: "tech-trade",
    name: "取引の記録",
    means: "だれと何をいくつ、を残せるようになった",
    effect: "しなものの値が 1.25倍になる",
    records: 500,
    needs: "area-3",
  },
  {
    level: 6,
    id: "tech-deed",
    name: "契約",
    means: "その場にいない相手とも、約束を交わせるようになった",
    effect: "遠方の商隊が来る。人が 1.4倍集まる",
    records: 1100,
    needs: "area-4",
  },
  {
    level: 7,
    id: "tech-law",
    name: "法",
    means: "だれにでも同じ決まりを、書き残せるようになった",
    effect: "町ぜんたいが 20%速くなり、値も 1.4倍になる",
    records: 2400,
    needs: "area-5",
  },
];

export const TECH_IDS = TECHS.map((tech) => tech.id);

/* ==================== 混乱 ==================== */

export type TroubleId =
  | "count"
  | "double"
  | "wrong"
  | "border"
  | "tax";

export type Trouble = {
  id: TroubleId;
  /** 何が起きたか（NPCの上に出す短い言葉） */
  short: string;
  /** HUDと吹き出しに出す言葉 */
  text: string;
  /** この段階の文字があれば、もう起きない */
  fixedAt: number;
};

/**
 * 仕様書 §10 の5つ。
 * 赤いエラーだけで済ませず、その場のNPCの上に吹き出しを出す
 * （描画は components/Shop.tsx の「混乱と、記録のようす」）。
 */
export const TROUBLES: Trouble[] = [
  {
    id: "count",
    short: "いくつ？",
    text: "倉の麦が何袋あるか分からない ― 数え直している",
    fixedAt: 1,
  },
  {
    id: "double",
    short: "また運ぶの？",
    text: "同じ荷を二人が運んでしまった ― 手が足りなくなる",
    fixedAt: 2,
  },
  {
    id: "wrong",
    short: "話がちがう",
    text: "商人へ渡す数をまちがえた ― 次の取引が減る",
    fixedAt: 5,
  },
  {
    id: "border",
    short: "ここは誰の畑？",
    text: "畑の境目で言い争いになっている ― 耕す手が止まる",
    fixedAt: 4,
  },
  {
    id: "tax",
    short: "もう納めた",
    text: "同じ家から二度取り立ててしまった ― 住民が困っている",
    fixedAt: 7,
  },
];

/** 混乱がひとつ起きるまでの、いちばん短い間（秒） */
const TROUBLE_GAP = 22;

/** 混乱の吹き出しが消えるまで（秒） */
export const TROUBLE_SHOW = 5.5;

/* ==================== 状態 ==================== */

export type MojiState = {
  /** 書き残した板の総数。このステージの成長そのもの */
  records: number;
  /** いまの文字の段階（0〜7） */
  tech: number;
  /** 次の混乱までの残り秒 */
  next: number;
  /** いま起きている混乱（描画とHUDが拾う） */
  trouble: { id: TroubleId; left: number; x: number; y: number } | null;
  /** 大法典碑を建てて、時代が終わったか */
  engraved: boolean;
  /** 描画側が拾う合図 */
  flash: string | null;
};

export const createMoji = (): MojiState => ({
  records: 0,
  tech: 0,
  next: TROUBLE_GAP,
  trouble: null,
  engraved: false,
  flash: null,
});

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toMoji = (moji: MojiState) => ({
  records: moji.records,
  tech: moji.tech,
  engraved: moji.engraved,
});

export const fromMoji = (input: unknown): MojiState => {
  const moji = createMoji();
  if (!input || typeof input !== "object") return moji;
  const raw = input as Record<string, unknown>;
  moji.records = Math.max(0, Math.floor(finite(raw.records, 0)));
  moji.tech = Math.min(
    TECHS.length - 1,
    Math.max(0, Math.floor(finite(raw.tech, 0))),
  );
  moji.engraved = raw.engraved === true;
  return moji;
};

/* ==================== 読み出し ==================== */

export const isMoji = (state: ShopState) => state.stageId === "moji";

/** 記録の総数 */
export const records = (state: ShopState) => (isMoji(state) ? state.moji.records : 0);

/** いまの文字の段階 */
export const tech = (state: ShopState): Tech =>
  TECHS[isMoji(state) ? state.moji.tech : 0];

/** 次の段階（もう最後なら null） */
export const nextTech = (state: ShopState): Tech | null =>
  isMoji(state) && state.moji.tech + 1 < TECHS.length
    ? TECHS[state.moji.tech + 1]
    : null;

/** 次の段階までの進みぐあい（0〜1）。HUDの帯に使う */
export const techProgress = (state: ShopState) => {
  const next = nextTech(state);
  if (!next) return 1;
  const from = TECHS[state.moji.tech].records;
  const span = Math.max(1, next.records - from);
  return Math.max(0, Math.min(1, (state.moji.records - from) / span));
};

/** 街に出ている書記の数（師匠も弟子も、市場や館づきの書記もふくむ） */
export const scribeCount = (state: ShopState) =>
  isMoji(state) ? state.staff.filter((who) => who.kind === "scribe").length : 0;

/** 記録をしまっておける建物（建てたものだけ数える） */
const ARCHIVES = ["build-archive", "build-archive2", "build-admin"];

export const archiveCount = (state: ShopState) =>
  isMoji(state) ? ARCHIVES.filter((id) => state.built.includes(id)).length : 0;

/**
 * 記録の処理能力。
 * 仕様書 §3 の `粘土板生産能力 × 書記人数 × 書記処理速度 × 保存能力` を、
 * 実際に画面へ出ているもの（書記・記録庫・文字の段階）から数える。
 */
export const capacity = (state: ShopState) =>
  4 + scribeCount(state) * 5 + archiveCount(state) * 8 + state.moji.tech * 4;

/**
 * 街が抱えている「憶えておかないといけないこと」の量。
 * 作業場・席・雇った人が増えるほど増える
 */
export const load = (state: ShopState) => {
  if (!isMoji(state)) return 0;
  // 動いている作業場・受け渡し場・人の数が、そのまま「憶えておくこと」の量になる
  const works = openStoves(state).filter((stove) => !stove.needs).length;
  return works * 2 + openSeats(state).length + state.staff.length;
};

/**
 * いまの混乱の強さ（0〜1）。
 *
 * 記録の処理能力が足りないぶんだけ濃くなる。
 * 詰みにしないため 0.45 で頭打ちにする（仕様書 §17「数字だけで進行しない」の裏返しで、
 * 混乱も数字で詰ませない）
 */
export const confusion = (state: ShopState) => {
  if (!isMoji(state)) return 0;
  const need = load(state);
  if (need <= 0) return 0;
  const over = need - capacity(state);
  if (over <= 0) return 0;
  return Math.max(0, Math.min(0.45, over / need));
};

/** 混乱の見出し（HUDに出す3段階） */
export const confusionLabel = (state: ShopState) => {
  const value = confusion(state);
  if (value < 0.08) return "落ちついている";
  if (value < 0.22) return "少し混みあっている";
  if (value < 0.36) return "取りちがえが増えている";
  return "手がつけられない";
};

/* ==================== 効き目 ==================== */

/** その作業場の進みぐあいの倍率（文字の段階 − 混乱） */
export const mojiWork = (state: ShopState, stove: StoveSpec) => {
  if (!isMoji(state)) return 1;
  const level = state.moji.tech;
  let rate = 1;

  // 1 数える印: 取りちがえと廃棄が減る
  if (level >= 1) rate *= 1.08;
  // 3 人の名前: 担当のいる作業場が速くなる（誰の受け持ちかが書いてある）
  if (level >= 3 && stoveHasCook(state, stove.id)) rate *= 1.15;
  // 4 土地の記録: 畑と粘土場（境目のある土地）が速くなる
  if (level >= 4) {
    const item = stoveItem(stove);
    if (item === "wheat" || item === "clay" || item === "reed") rate *= 1.25;
  }
  // 7 法: 決まりが行きわたって、町ぜんたいが速くなる
  if (level >= 7) rate *= 1.2;

  // 混乱のぶんだけ鈍る。止まりはしない
  rate *= 1 - confusion(state) * 0.35;
  return rate;
};

/** 人の集まりやすさの倍率（市場が広がると遠くからも来る） */
export const mojiDraw = (state: ShopState) => {
  if (!isMoji(state)) return 1;
  const level = state.moji.tech;
  let rate = 1;
  if (level >= 2) rate *= 1.2;
  if (level >= 6) rate *= 1.4;
  // 混乱していると、来た人が帰ってしまう
  rate *= 1 - confusion(state) * 0.3;
  return rate;
};

/** しなものの値の倍率（取引を書き残せると、まとまった商いになる） */
export const mojiValue = (state: ShopState) => {
  if (!isMoji(state)) return 1;
  const level = state.moji.tech;
  let rate = 1;
  if (level >= 5) rate *= 1.25;
  if (level >= 7) rate *= 1.4;
  return rate;
};

/* ==================== 記録がたまる ==================== */

/**
 * 作業場がひとつ作りおえたときに呼ばれる。
 * 書き残した板（記録板・契約板・土地記録・徴税記録）だけを記録として数える
 */
export const mojiMade = (state: ShopState, stove: StoveSpec) => {
  if (!isMoji(state)) return;
  const weight = WRITTEN[stoveItem(stove)];
  if (!weight) return;
  state.moji.records += weight;
};

/* ==================== 進みの印 ==================== */

/**
 * 買い物では表せない条件。満たすと unlocked に入り、
 * 次の区画や枠がここにぶら下がる（大河の文明と同じ作り）。
 */
const MOJI_MARKS: { id: string; reach: (state: ShopState) => boolean }[] = [
  { id: "mark-first-tablet", reach: (state) => state.moji.records >= 1 },
  { id: "mark-records-30", reach: (state) => state.moji.records >= 30 },
  { id: "mark-records-200", reach: (state) => state.moji.records >= 200 },
  { id: "mark-records-800", reach: (state) => state.moji.records >= 800 },
  { id: "mark-scribes-4", reach: (state) => scribeCount(state) >= 4 },
  { id: "mark-calm", reach: (state) => load(state) >= 20 && confusion(state) <= 0.05 },
  ...TECHS.map((item) => ({
    id: item.id,
    reach: (state: ShopState) => state.moji.tech >= item.level,
  })),
];

export const MOJI_MARK_IDS = MOJI_MARKS.map((mark) => mark.id);

const toast = (state: ShopState, text: string) => {
  state.toast = { text, at: Date.now() };
};

/* ==================== 1フレーム ==================== */

export const updateMoji = (state: ShopState, dt: number) => {
  if (!isMoji(state)) return;
  const moji = state.moji;
  moji.flash = null;

  /* --- 文字が一段あがる --- */
  const next = nextTech(state);
  if (
    next &&
    moji.records >= next.records &&
    (!next.needs || state.unlocked.includes(next.needs))
  ) {
    moji.tech = next.level;
    moji.flash = "tech";
    /*
     * 「文字Lv.4」ではなく、何ができるようになったかで知らせる（仕様書 §13）。
     * 解放と同時に、街の見た目もその場で変わる（描画側が tech を見ている）
     */
    toast(state, `📖 ${next.name} ― ${next.means}`);
    state.sfx.push("buy");
  }

  /* --- 印 --- */
  for (const mark of MOJI_MARKS) {
    if (state.unlocked.includes(mark.id)) continue;
    if (!mark.reach(state)) continue;
    state.unlocked.push(mark.id);
  }

  /* --- 混乱 --- */
  if (moji.trouble) {
    moji.trouble.left -= dt;
    if (moji.trouble.left <= 0) moji.trouble = null;
  }

  const heat = confusion(state);
  if (heat <= 0.05) {
    // 落ちついているあいだは、次の合図までの時計を止めておく
    moji.next = TROUBLE_GAP;
    return;
  }

  moji.next -= dt;
  if (moji.next > 0) return;

  // 混乱が濃いほど、次までが短い
  moji.next = TROUBLE_GAP * (1 - heat) + 6;
  const open = TROUBLES.filter((item) => moji.tech < item.fixedAt);
  if (open.length === 0) return;
  const pick = open[Math.floor(Math.random() * open.length)];
  /*
   * 起きた場所は、いま画面のどこかで働いている人のそば。
   * 描画側がここへ吹き出しを出す（赤いエラーUIだけにしない・仕様書 §10）
   */
  const who =
    state.staff.length > 0
      ? state.staff[Math.floor(Math.random() * state.staff.length)]
      : null;
  moji.trouble = {
    id: pick.id,
    left: TROUBLE_SHOW,
    x: who ? who.pos.x : state.player.pos.x,
    y: who ? who.pos.y : state.player.pos.y,
  };
  moji.flash = "trouble";
  toast(state, `⚠️ ${pick.text}`);
};

/** 大法典碑が建ったときの、この時代の終わり */
export const mojiEngrave = (state: ShopState) => {
  if (state.moji.engraved) return;
  state.moji.engraved = true;
  state.moji.flash = "engrave";
  toast(state, "人類は、記憶を文明に残せるようになった。");
};
