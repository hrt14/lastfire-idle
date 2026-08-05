/**
 * BGM・環境音。
 *
 * 効果音（lib/sfx.ts）と同じく、音声ファイルは持たずその場で鳴らす。
 * 常に鳴っている「下敷き」（ドローン）に、場面ごとの層を足し引きする:
 *
 *   ラーメン一直線・ドリームパーク  ステージごとに1つの、あたたかい和音
 *   火のはじまり                    区画・昼夜・天気で層が変わる
 *     - 焚き火のパチパチ（区画をとおして流れる下敷き）
 *     - 昼は鳥、夜は虫の声
 *     - マンモスの谷は低い緊張の唸り。突進では一瞬あおる
 *     - 冬の丘は風、氷のきらめき
 *     - 川辺は水の音
 *
 * 層はどれも「作って、音量を上げ下げする」だけ。作り直さない。
 * 区画をまたぐたびに和音がなめらかに変わるのは、
 * 同じ発振器の周波数をなだらかに ramp しているから
 */

import { getCtx } from "@/lib/sfx";

export type Scene = {
  stage: "ramen" | "park" | "fire";
  /** いまプレイヤーが立っている区画（0始まり）。ラーメン・パークでは使わない */
  area: number;
  phase: "day" | "dusk" | "night";
  weather: "clear" | "cold" | "blizzard";
  /** 谷の巨獣の様子（緊張の層に使う） */
  beast: "none" | "calm" | "active" | "charge" | "down";
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

/* ---------- 和音の下敷き（区画ごとに周波数だけ変える） ---------- */

/** [根音, 三度・五度ぶん, オクターブ] のHz。区画をまたぐと、ここへなめらかに移る */
const CHORDS: Record<string, [number, number, number]> = {
  ramen: [196, 247, 294], // G3 - B3 - D4（あたたかい長三和音）
  park: [220, 277, 330], // A3 - C#4 - E4（明るく高め）
  "fire-0": [147, 175, 220], // D3 - F3 - A3（原始的な短調ぎみ）
  "fire-1": [147, 175, 220],
  "fire-2": [131, 156, 196], // C3 - Eb3 - G3（谷。少し低く、不安げに）
  "fire-3": [165, 196, 247], // E3 - G3 - B3（冬。冷たい響き）
  "fire-4": [175, 220, 262], // F3 - A3 - C4（村。あたたかい長調）
  "fire-5": [110, 165, 277], // A2 - E3 - C#4（川。ひらけた響き）
};

const chordKey = (scene: Scene) =>
  scene.stage === "fire" ? `fire-${Math.min(5, Math.max(0, scene.area))}` : scene.stage;

type Pad = {
  osc: OscillatorNode[];
  out: GainNode;
  filter: BiquadFilterNode;
};

const buildPad = (ctx: AudioContext, dest: AudioNode): Pad => {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.4;

  const out = ctx.createGain();
  out.gain.value = 1;
  filter.connect(out);
  out.connect(dest);

  // ゆっくり動くフィルターのうねり（LFO）
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const shapes: OscillatorType[] = ["triangle", "sine", "sine"];
  const gains = [0.5, 0.32, 0.16];
  const osc = shapes.map((type, i) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.detune.value = i === 0 ? -4 : 4;
    const g = ctx.createGain();
    g.gain.value = gains[i];
    o.connect(g);
    g.connect(filter);
    o.start();
    return o;
  });

  return { osc, out, filter };
};

const tunePad = (pad: Pad, chord: [number, number, number], now: number) => {
  pad.osc.forEach((osc, i) => {
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setValueAtTime(osc.frequency.value, now);
    osc.frequency.linearRampToValueAtTime(chord[i], now + 1.6);
  });
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

/* ---------- 谷の緊張（低い唸り） ---------- */

type Tension = { gain: GainNode };

const buildTension = (ctx: AudioContext, dest: AudioNode): Tension => {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 58;
  const gain = ctx.createGain();
  // 目標の音量は updateBgm がここへ ramp する。それに、小さくうねる throb を足しこむ
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(dest);

  const trem = ctx.createOscillator();
  trem.frequency.value = 3.2;
  const tremGain = ctx.createGain();
  tremGain.gain.value = 0.05;
  trem.connect(tremGain);
  tremGain.connect(gain.gain);
  osc.start();
  trem.start();
  return { gain };
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

let pad: Pad | null = null;
let crackle: Crackle | null = null;
let birdTimer = 0;
let cricketTimer = 0;
let wind: Sweep | null = null;
let water: Sweep | null = null;
let tension: Tension | null = null;
let lastKey = "";
let chargeFlash = 0;

/** ノードをまだ作っていなければ作る。AudioContext ができてから1回だけ */
const ensureBuilt = (ctx: AudioContext) => {
  if (built) return;
  built = true;
  master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const at = ctx.currentTime + 0.6;
  master.gain.linearRampToValueAtTime(bgmMuted ? 0 : MASTER_LEVEL, at);

  pad = buildPad(ctx, master);
  crackle = buildCrackle(ctx, master);
  wind = buildSweep(ctx, master, "lowpass", 700, 500, 0.09);
  water = buildSweep(ctx, master, "bandpass", 1100, 500, 0.16);
  tension = buildTension(ctx, master);
};

/**
 * 毎フレーム呼ぶ。まだ音が解錠されていなければ何もしない。
 * 場面が変わったところだけ和音をなだらかに移し、
 * 層の音量を目標値へ寄せていく。鳥・虫・パチパチは、ここでたまに1つ鳴らす
 */
export const updateBgm = (scene: Scene, dt: number) => {
  const ctx = getCtx();
  if (!ctx) return;
  ensureBuilt(ctx);
  if (!pad || !crackle || !wind || !water || !tension || !master) return;
  const now = ctx.currentTime;
  const RAMP = 1.4;

  const key = chordKey(scene);
  if (key !== lastKey) {
    lastKey = key;
    tunePad(pad, CHORDS[key] ?? CHORDS["fire-0"], now);
  }

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

  // 谷の緊張: 巨獣がいるときだけ。突進の瞬間はひときわ強くなる
  chargeFlash = Math.max(0, chargeFlash - dt * 1.4);
  if (scene.beast === "charge") chargeFlash = 1;
  const tensionBase = !valley
    ? 0
    : scene.beast === "none"
      ? 0
      : scene.beast === "down"
        ? 0.05
        : scene.beast === "active"
          ? 0.22
          : 0.12;
  tension.gain.gain.linearRampToValueAtTime(
    tensionBase + chargeFlash * 0.35,
    now + (chargeFlash > 0.5 ? 0.15 : RAMP),
  );

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
