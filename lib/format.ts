const units = [
  { value: 1e12, suffix: "兆" },
  { value: 1e8, suffix: "億" },
  { value: 1e4, suffix: "万" },
];

export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  for (const unit of units) {
    if (abs >= unit.value) {
      const scaled = abs / unit.value;
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return `${sign}${scaled.toFixed(digits)}${unit.suffix}`;
    }
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

/** 円の表示。1万未満は整数、そこから上は万・億でまとめる */
export const formatYen = (value: number): string => {
  const abs = Math.abs(value);
  if (abs < 10000) return `${Math.round(value).toLocaleString("ja-JP")}円`;
  return `${formatNumber(value)}円`;
};
