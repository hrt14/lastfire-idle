/**
 * Firebase の入り口。
 * ログインしなくても遊べる（その場合は、この端末のなかだけに記録が残る）。
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * ウェブの Firebase 設定。ブラウザに配られる公開値なので、ここに直接書いておく。
 * （環境変数から読むのはやめた。値の取り違えで動かなくなる事故が起きやすいため）
 */
const config = {
  apiKey: "AIzaSyBDjwDlVG51mrZCIYWH1v0CrtqR3AYEs-k",
  authDomain: "working-planet.firebaseapp.com",
  projectId: "working-planet",
  storageBucket: "working-planet.firebasestorage.app",
  messagingSenderId: "299273365543",
  appId: "1:299273365543:web:f5ce35b6bc35bb83140602",
};

/**
 * ログインの受け口。
 *
 * スマホのブラウザは「別ドメインへ飛んで戻る」ログインを遮るので、
 * 公開ドメインでは受け口を同じドメインに置く（next.config.ts で中継）。
 * パソコンはポップアップで完結するため、Firebase の受け口のままでよい。
 */
const sameSiteHost = () =>
  typeof window !== "undefined" &&
  window.location.hostname === "working-planet.hitobito.jp";

const onPhone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints ?? 0) > 0);

/** ページ移動でログインするか（スマホ） */
export const redirectLogin = () => onPhone();

const authDomain = () =>
  sameSiteHost() && onPhone() ? window.location.hostname : config.authDomain;

/** いま使っている設定の目印（どのビルドが動いているかの確認用） */
export const configMark = () =>
  `${config.projectId}/…${config.apiKey.slice(-6)}/${authDomain()}`;

/** ログイン機能を出してよいか（設定がそろっているか） */
export const cloudReady = () =>
  !!config.apiKey && !!config.authDomain && !!config.projectId && !!config.appId;

let app: FirebaseApp | null = null;

const firebaseApp = (): FirebaseApp | null => {
  if (!cloudReady()) return null;
  if (!app) {
    app = getApps().length
      ? getApp()
      : initializeApp({ ...config, authDomain: authDomain() });
  }
  return app;
};

export const authClient = (): Auth | null => {
  const instance = firebaseApp();
  return instance ? getAuth(instance) : null;
};

export const dbClient = (): Firestore | null => {
  const instance = firebaseApp();
  return instance ? getFirestore(instance) : null;
};
