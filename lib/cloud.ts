/**
 * Google ログインと、セーブのクラウド保存。
 *
 * 方針:
 *   - ログインしなくても遊べる（この端末のなかだけで保存）
 *   - ログインすると、あたらしい方（savedAt が新しい方）を正として合わせる
 *   - そのあとは、書き込むたびに少し待ってからクラウドへ送る
 */

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { authClient, cloudReady, dbClient } from "@/lib/firebase";

export { cloudReady };

export type Account = {
  uid: string;
  name: string;
  photo: string | null;
};

export type CloudState = {
  account: Account | null;
  /** "off" 未設定 / "out" 未ログイン / "syncing" 同期中 / "ok" 同期ずみ / "error" 失敗 */
  status: "off" | "out" | "syncing" | "ok" | "error";
  at: number;
};

let state: CloudState = {
  account: null,
  status: cloudReady() ? "out" : "off",
  at: 0,
};

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const setState = (next: Partial<CloudState>) => {
  state = { ...state, ...next, at: Date.now() };
  emit();
};

export const cloudState = () => state;

export const watchCloud = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/* ---------- セーブの読み書き ---------- */

type Bag = Record<string, unknown> & { savedAt?: number };

const docRef = (uid: string) => {
  const db = dbClient();
  return db ? doc(db, "saves", uid) : null;
};

export const pullVault = async (uid: string): Promise<Bag | null> => {
  const ref = docRef(uid);
  if (!ref) return null;
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Bag;
};

export const pushVault = async (uid: string, vault: Bag) => {
  const ref = docRef(uid);
  if (!ref) return;
  await setDoc(ref, vault, { merge: false });
};

/* ---------- ログイン ---------- */

let hooks: {
  read: () => Bag;
  write: (vault: Bag) => void;
} | null = null;

/** セーブの読み書きをつなぐ（shopStore から呼ぶ） */
export const bindVault = (read: () => Bag, write: (vault: Bag) => void) => {
  hooks = { read, write };
};

/** ログイン直後の突き合わせ。新しい方を正とする */
const merge = async (uid: string) => {
  if (!hooks) return;
  setState({ status: "syncing" });
  try {
    const remote = await pullVault(uid);
    const local = hooks.read();
    const localAt = Number(local.savedAt ?? 0);
    const remoteAt = Number(remote?.savedAt ?? 0);
    if (remote && remoteAt > localAt) {
      hooks.write(remote);
    } else {
      await pushVault(uid, local);
    }
    setState({ status: "ok" });
  } catch {
    setState({ status: "error" });
  }
};

let timer: ReturnType<typeof setTimeout> | null = null;

/** 保存のたびに呼ばれる。まとめて少し遅らせて送る */
export const syncVault = (vault: Bag) => {
  const uid = state.account?.uid;
  if (!uid || !cloudReady()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    setState({ status: "syncing" });
    pushVault(uid, vault)
      .then(() => setState({ status: "ok" }))
      .catch(() => setState({ status: "error" }));
  }, 4000);
};

let started = false;

/** 画面が出たら一度だけ呼ぶ */
export const startCloud = () => {
  if (started || !cloudReady()) return;
  started = true;
  const auth = authClient();
  if (!auth) return;
  onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      setState({ account: null, status: "out" });
      return;
    }
    setState({
      account: {
        uid: user.uid,
        name: user.displayName ?? "プレイヤー",
        photo: user.photoURL ?? null,
      },
      status: "syncing",
    });
    void merge(user.uid);
  });
};

export const signIn = async () => {
  const auth = authClient();
  if (!auth) return;
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch {
    setState({ status: "error" });
  }
};

export const signOutAccount = async () => {
  const auth = authClient();
  if (!auth) return;
  await signOut(auth);
};
