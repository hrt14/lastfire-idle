import {
  SAVE_KEY,
  applyOffline,
  createState,
  fromPersisted,
  toPersisted,
  type OfflineReport,
  type ShopState,
} from "@/lib/shop";

let state: ShopState | null = null;

const load = (): ShopState => {
  try {
    const stored = window.localStorage.getItem(SAVE_KEY);
    return stored ? fromPersisted(JSON.parse(stored)) : createState();
  } catch {
    return createState();
  }
};

/** クライアントでのみ呼ぶこと */
export const getState = (): ShopState => {
  if (!state) state = load();
  return state;
};

export const save = () => {
  if (!state) return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(toPersisted(state)));
  } catch {
    // 保存できない環境ではそのまま続行する
  }
};

export const resetState = () => {
  state = createState();
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // 何もしない
  }
  return state;
};

export const catchUp = (): OfflineReport | null => {
  const current = getState();
  return applyOffline(current, Date.now());
};
