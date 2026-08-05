/**
 * BGM・環境音。
 *
 * 効果音（lib/sfx.ts）と同じく、音声ファイルは持たずその場で鳴らす。
 * 和音のドローンは持たない。あくまで「そこにいる音」だけを重ねる:
 *
 *   火のはじまり  区画・昼夜・天気で層が変わる
 *     - 焚き火のパチパチ（区画をとおして流れる下敷き）
 *     - 昼は鳥、夜は虫の声
 *     - 冬の丘は風
 *     - 川辺は水の音
 *   ドリームパーク  ときどき鳴る、木琴のようなきらめき（持続音ではない）
 *   ラーメン一直線  いまのところ環境音なし
 *
 * 持続する発振器（ドローン・低音）は置かない。鳴りっぱなしの音は
 * 「消えないメッセージ」と同じで、それ自体が気になってしまうため
 *
 * 層はどれも「作って、音量を上げ下げする」だけ。作り直さない
 */

import { getCtx } from "@/lib/sfx";

export type Scene = {
  stage: "ramen" | "park" | "fire";
  /** いまプレイヤーが立っている区画（0始まり）。ラーメン・パークでは使わない */
  area: number;
  phase: "day" | "dusk" | "night";
  weather: "clear" | "cold" | "blizzard";
};

const BGM_KEY = "ramen-arcade-bgm-muted";
const MASTER_LEVEL = 0.16;

let bgmMuted = false;
let master: GainNode | null = null;
let built = false;

export const loadBgmMuted = () => {
  try {
    bgmMuted = window.localStorage.getItem(BGM_KEY) === "1";
  } catch {
    bgmMuted = false;
  }
  applyMute();
  return bgmMuted;
};

export const isBgmMuted = () => bgmMuted;

export const setBgmMuted = (value: boolean) => {
  bgmMuted = value;
  applyMute();
  try {
    window.localStorage.setItem(BGM_KEY, bgmMuted ? "1" : "0");
  } catch {
    // 保存できなくても切り替わりはする
  }
};

const applyMute = () => {
  if (!master) return;
  const ctx = getCtx();
  if (!ctx) return;
  master.gain.linearRampToValueAtTime(
    bgmMuted ? 0 : MASTER_LEVEL,
    ctx.currentTime + 0.4,
  );
};

/* ---------- 共有のノイズ（風・水・焚き火のもと） ---------- */

let noiseBuffer: AudioBuffer | null = null;
const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  if (noiseBuffer) return noiseBuffer;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
};

const loopingNoise = (ctx: AudioContext): AudioBufferSourceNode => {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;
  src.start();
  return src;
};

/* ---------- 焚き火のパチパチ ---------- */

type Crackle = {
  hiss: GainNode;
  popTimer: number;
};

const buildCrackle = (ctx: AudioContext, dest: AudioNode): Crackle => {
  const src = loopingNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1600;
  filter.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.value = 0.055;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  return { hiss: gain, popTimer: 0 };
};

const pop = (ctx: AudioContext, dest: AudioNode, loud: number) => {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800 + Math.random() * 2200;
  filter.Q.value = 3 + Math.random() * 3;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const dur = 0.03 + Math.random() * 0.05;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.5 * loud, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(now);
  src.stop(now + dur + 0.02);
};

/* ---------- 鳥・虫 ---------- */

const chirp = (ctx: AudioContext, dest: AudioNode, bird: boolean, loud: number) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = bird ? "sine" : "triangle";
  const base = bird ? 1800 + Math.random() * 900 : 3200 + Math.random() * 500;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(
    bird ? base * 0.72 : base * 1.03,
    now + (bird ? 0.09 : 0.045),
  );
  const dur = bird ? 0.11 : 0.05;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22 * loud, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + dur + 0.02);
};

/* ---------- 風・水 ---------- */

type Sweep = { gain: GainNode; filter: BiquadFilterNode };

const buildSweep = (
  ctx: AudioContext,
  dest: AudioNode,
  type: "lowpass" | "bandpass",
  base: number,
  swing: number,
  rate: number,
): Sweep => {
  const src = loopingNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = base;
  filter.Q.value = type === "bandpass" ? 0.9 : 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = swing;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return { gain, filter };
};

/* ---------- きらめき（パーク・冬） ---------- */

const NOTE_SETS: Record<string, number[]> = {
  park: [440, 554, 659, 880],
  winter: [659, 784, 988, 1318],
};

let sparkleTimer = 0;

const sparkle = (ctx: AudioContext, dest: AudioNode, set: number[], loud: number) => {
  const now = ctx.currentTime;
  const freq = set[Math.floor(Math.random() * set.length)];
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16 * loud, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 1);
};

/* ---------- まとめ ---------- */

let crackle: Crackle | null = null;
let birdTimer = 0;
let cricketTimer = 0;
let wind: Sweep | null = null;
let water: Sweep | null = null;

/** ノードをまだ作っていなければ作る。AudioContext ができてから1回だけ */
const ensureBuilt = (ctx: AudioContext) => {
  if (built) return;
  built = true;
  master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const at = ctx.currentTime + 0.6;
  master.gain.linearRampToValueAtTime(bgmMuted ? 0 : MASTER_LEVEL, at);

  crackle = buildCrackle(ctx, master);
  wind = buildSweep(ctx, master, "lowpass", 700, 500, 0.09);
  water = buildSweep(ctx, master, "bandpass", 1100, 500, 0.16);
};

/**
 * 毎フレーム呼ぶ。まだ音が解錠されていなければ何もしない。
 * 層の音量を目標値へ寄せていくだけ。鳥・虫・パチパチ・きらめきは、
 * ここでたまに1つ鳴らす（どれも一過性で、鳴りっぱなしにはしない）
 */
export const updateBgm = (scene: Scene, dt: number) => {
  const ctx = getCtx();
  if (!ctx) return;
  ensureBuilt(ctx);
  if (!crackle || !wind || !water || !master) return;
  const now = ctx.currentTime;
  const RAMP = 1.4;

  const isFire = scene.stage === "fire";
  const area = scene.area;
  const isDay = scene.phase === "day";
  const isNight = scene.phase === "night";
  const winter = isFire && area === 3;
  const river = isFire && area === 5;
  const valley = isFire && area === 2;
  const blizzard = winter && scene.weather === "blizzard";

  // 焚き火: 谷と川辺では遠く／小さく、それ以外は常にそば
  const crackleTarget = !isFire ? 0 : valley || river ? 0.3 : winter ? 1.15 : 0.85;
  crackle.hiss.gain.linearRampToValueAtTime(0.055 * crackleTarget, now + RAMP);

  // 鳥・虫: 火のはじまりだけ。昼は鳥、夜は虫（夕方はどちらも控えめ）
  const birdLevel = isFire ? (isDay ? 1 : scene.phase === "dusk" ? 0.35 : 0) * (winter ? 0.4 : 1) : 0;
  const cricketLevel = isFire ? (isNight ? 1 : scene.phase === "dusk" ? 0.35 : 0) : 0;
  birdTimer -= dt;
  if (birdLevel > 0.05 && birdTimer <= 0) {
    birdTimer = 1.6 + Math.random() * 3.4;
    chirp(ctx, master, true, birdLevel);
  } else if (birdLevel <= 0.05) {
    birdTimer = Math.max(birdTimer, 0.5);
  }
  cricketTimer -= dt;
  if (cricketLevel > 0.05 && cricketTimer <= 0) {
    cricketTimer = 0.5 + Math.random() * 0.6;
    chirp(ctx, master, false, cricketLevel * 0.8);
  } else if (cricketLevel <= 0.05) {
    cricketTimer = Math.max(cricketTimer, 0.5);
  }

  // パチパチのはぜる音（焚き火が聞こえているときだけ）
  crackle.popTimer -= dt;
  if (crackleTarget > 0.05 && crackle.popTimer <= 0) {
    crackle.popTimer = (0.15 + Math.random() * 0.75) / Math.max(0.3, crackleTarget);
    pop(ctx, master, Math.min(1, crackleTarget));
  }

  // 風: 冬の丘。吹雪だと強く、荒く
  const windTarget = winter ? (blizzard ? 0.16 : 0.075) : 0;
  wind.gain.gain.linearRampToValueAtTime(windTarget, now + RAMP);
  wind.filter.frequency.setTargetAtTime(blizzard ? 1100 : 700, now, 0.8);

  // 水: 川辺
  const waterTarget = river ? 0.09 : 0;
  water.gain.gain.linearRampToValueAtTime(waterTarget, now + RAMP);

  // きらめき: パークと、冬の丘
  sparkleTimer -= dt;
  const sparkleSet = scene.stage === "park" ? NOTE_SETS.park : winter ? NOTE_SETS.winter : null;
  if (sparkleSet && sparkleTimer <= 0) {
    sparkleTimer = 2.6 + Math.random() * 3.6;
    sparkle(ctx, master, sparkleSet, scene.stage === "park" ? 0.55 : 0.32);
  }
};

/** 画面を離れるときに呼ぶ。作った層はそのまま、音量だけすっと絞る */
export const suspendBgm = () => {
  const ctx = getCtx();
  if (!ctx || !master) return;
  master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
};
