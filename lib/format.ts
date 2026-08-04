const units = [
  { value: 1e12, suffix: "兆" },
  { value: 1e8, suffix: "億" },
  { value: 1e4, suffix: "万" },
];

/** その大きさなら、小数を何桁見せるか */
const digitsFor = (scaled: number) => (scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2);

export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  for (const [index, unit] of units.entries()) {
    if (abs < unit.value) continue;
    const scaled = abs / unit.value;
    let digits = digitsFor(scaled);
    // 丸めたら桁が増える値（9.9999 → 10.00）は、増えたあとの桁数で出す
    while (digits > 0 && digitsFor(Number(scaled.toFixed(digits))) < digits) {
      digits = digitsFor(Number(scaled.toFixed(digits)));
    }
    // 丸めた結果が次の単位に届いたら、そちらへ繰り上げる。
    // （9999.99万 を「10000万」と出さず「1.00億」にする）
    const upper = units[index - 1];
    if (upper && Number(scaled.toFixed(digits)) * unit.value >= upper.value) {
      const up = abs / upper.value;
      return `${sign}${up.toFixed(digitsFor(up))}${upper.suffix}`;
    }
    return `${sign}${scaled.toFixed(digits)}${unit.suffix}`;
  }
  if (abs >= 1000) return `${sign}${Math.floor(abs).toLocaleString("ja-JP")}`;
  if (abs >= 100) return `${sign}${Math.floor(abs)}`;
  if (abs >= 10) return `${sign}${abs.toFixed(1)}`;
  if (abs === 0) return "0";
  return `${sign}${abs.toFixed(abs < 1 ? 2 : 1)}`;
};

export const formatRate = (value: number): string => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value))}/秒`;
};

export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}時間${minutes}分`;
  if (minutes > 0) return `${minutes}分${rest}秒`;
  return `${rest}秒`;
};

export const formatClock = (seconds: number): string => {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

/**
 * お金の短縮表記。1万未満は区切りつきの整数、そこから上は万・億・兆でまとめる。
 *
 *   9,999貝 / 1.00万貝 / 12.3万貝 / 1.23億貝 / 1.23兆貝
 *
 * 単位はステージごとに変わる（火のはじまりは「貝」）。
 * 桁がどれだけ増えても文字数がほぼ変わらないので、HUD の並びが押し出されない。
 */
export const formatMoney = (value: number, unit = "円"): string => {
  const abs = Math.abs(value);
  if (abs < 10000) return `${Math.round(value).toLocaleString("ja-JP")}${unit}`;
  return `${formatNumber(value)}${unit}`;
};

/** 省略なしの正確な金額（タップで開くポップオーバー用） */
export const formatExact = (value: number, unit = "円"): string =>
  `${Math.floor(value).toLocaleString("ja-JP")}${unit}`;

/** 円の表示。1万未満は整数、そこから上は万・億でまとめる */
export const formatYen = (value: number): string => formatMoney(value, "円");
