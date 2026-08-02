/**
 * Firebase の入り口。
 * 環境変数がそろっていないときは何も起動せず、ゲームはこれまでどおり
 * この端末のなかだけで動く（ログインなしでも遊べる）。
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** ログイン機能を出してよいか（設定がそろっているか） */
export const cloudReady = () =>
  !!config.apiKey && !!config.authDomain && !!config.projectId && !!config.appId;

let app: FirebaseApp | null = null;

const firebaseApp = (): FirebaseApp | null => {
  if (!cloudReady()) return null;
  if (!app) {
    app = getApps().length
      ? getApp()
      : initializeApp({
          apiKey: config.apiKey!,
          authDomain: config.authDomain!,
          projectId: config.projectId!,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId!,
        });
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
