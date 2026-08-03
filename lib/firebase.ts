/**
 * Firebase の入り口。
 * 環境変数がそろっていないときは何も起動せず、ゲームはこれまでどおり
 * この端末のなかだけで動く（ログインなしでも遊べる）。
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * ウェブの Firebase 設定は、ブラウザに配られる公開値なので、そのまま書いておく。
 * 環境変数を入れた場合はそちらが優先される（別のプロジェクトに向けたいとき用）。
 */
const built = {
  apiKey: "AIzaSyBDjwDlVG51mrZCIYWH1v0CrtqR3AYEs-k",
  authDomain: "working-planet.firebaseapp.com",
  projectId: "working-planet",
  storageBucket: "working-planet.firebasestorage.app",
  messagingSenderId: "299273365543",
  appId: "1:299273365543:web:f5ce35b6bc35bb83140602",
};

/** 前後の空白や引用符が紛れ込んでいても拾えるようにする */
const pick = (value: string | undefined, fallback: string) => {
  const clean = (value ?? "").trim().replace(/^["']|["']$/g, "");
  return clean || fallback;
};

const config = {
  apiKey: pick(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, built.apiKey),
  authDomain: pick(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, built.authDomain),
  projectId: pick(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, built.projectId),
  storageBucket: pick(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    built.storageBucket,
  ),
  messagingSenderId: pick(
    process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
    built.messagingSenderId,
  ),
  appId: pick(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, built.appId),
};

/** ログイン機能を出してよいか（設定がそろっているか） */
export const cloudReady = () =>
  !!config.apiKey && !!config.authDomain && !!config.projectId && !!config.appId;

let app: FirebaseApp | null = null;

const firebaseApp = (): FirebaseApp | null => {
  if (!cloudReady()) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
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
