/**
 * 効果音。音声ファイルは持たず、WebAudio でその場で鳴らす。
 * 最初のタップ／キー入力で AudioContext を起こす（ブラウザの自動再生制限のため）。
 */

export type SoundId = "coin" | "serve" | "buy" | "upgrade";

const MUTE_KEY = "ramen-arcade-muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

type Ctor = typeof AudioContext;

const createContext = (): AudioContext | null => {
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  const Ctx = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return null;
  try {
    return new Ctx();
  } catch {
    return null;
  }
};

export const loadMuted = () => {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }
  if (master) master.gain.value = muted ? 0 : 0.22;
  return muted;
};

export const isMuted = () => muted;

export const setMuted = (value: boolean) => {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.22;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // 保存できなくても音は切り替わる
  }
};

/** ユーザー操作のたびに呼ぶ。初回だけ実際に初期化される */
export const unlockAudio = () => {
  if (!ctx) {
    ctx = createContext();
    if (!ctx) return;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
};

/**
 * BGM（lib/bgm.ts）が使う、共有の AudioContext。
 * AudioContext は1ページに1つが作法なので、効果音と鳴らし場所を分ける。
 * unlockAudio() が呼ばれるまでは null（最初のタップ／キー入力を待つ）
 */
export const getCtx = () => ctx;

type Note = {
  freq: number;
  /** 開始（秒） */
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  /** 終端の周波数（グリッサンド） */
  to?: number;
};

const play = (notes: Note[]) => {
  if (!ctx || !master || muted) return;
  const now = ctx.currentTime;
  for (const note of notes) {
    const start = now + (note.at ?? 0);
    const dur = note.dur ?? 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? "triangle";
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.gain ?? 0.5, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
};

const sounds: Record<SoundId, () => void> = {
  // チャリン
  coin: () =>
    play([
      { freq: 1568, dur: 0.07, gain: 0.45 },
      { freq: 2093, at: 0.045, dur: 0.13, gain: 0.38 },
    ]),
  // コトッ（丼を置く）
  serve: () =>
    play([
      { freq: 420, to: 240, dur: 0.09, type: "sine", gain: 0.5 },
      { freq: 880, dur: 0.04, type: "triangle", gain: 0.16 },
    ]),
  // 買えた
  buy: () =>
    play([
      { freq: 523, dur: 0.08, gain: 0.4 },
      { freq: 659, at: 0.07, dur: 0.08, gain: 0.4 },
      { freq: 784, at: 0.14, dur: 0.09, gain: 0.4 },
      { freq: 1046, at: 0.22, dur: 0.16, gain: 0.42 },
    ]),
  // 強化した
  upgrade: () =>
    play([
      { freq: 660, dur: 0.07, gain: 0.4 },
      { freq: 990, at: 0.06, dur: 0.12, gain: 0.4 },
    ]),
};

export const playSound = (id: SoundId) => {
  sounds[id]?.();
};

/**
 * 連続で渡したときの、音がだんだん高くなるチャイム。
 * step が大きいほど高い（1オクターブで頭打ち）。爽快感を出す。
 */
export const playCombo = (step: number) => {
  const semis = Math.min(Math.max(0, step - 1), 12);
  const freq = 1046 * Math.pow(2, semis / 12);
  play([
    { freq, dur: 0.06, gain: 0.4, type: "triangle" },
    { freq: freq * 1.5, at: 0.03, dur: 0.09, gain: 0.28 },
  ]);
};
