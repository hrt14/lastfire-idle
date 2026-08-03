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
 * 公開ドメインでは、next.config.ts の中継のおかげで同じドメインのまま
 * ログインできる（スマホの Safari 対策）。ほかの場所では既定のまま。
 */
const SAME_SITE_AUTH = new Set(["working-planet.hitobito.jp"]);

const authDomain = () => {
  if (typeof window === "undefined") return config.authDomain;
  const host = window.location.hostname;
  return SAME_SITE_AUTH.has(host) ? host : config.authDomain;
};

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
