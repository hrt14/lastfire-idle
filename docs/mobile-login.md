# スマホ（iOS Safari）で Google ログインが完了しない — 現状まとめ

外部の相談用にまとめた資料。2026-08-03 時点。

## 何を作っているか

- Next.js 16（App Router）+ React 19 の静的寄りな SPA。ゲーム本体はクライアントのみで動く
- ホスティングは **Vercel**（プロジェクト名 `lastfire-idle`）
- 公開ドメイン **`working-planet.hitobito.jp`**（`hitobito.jp` の DNS に CNAME → `cname.vercel-dns.com`。Vercel 側で Valid Configuration）
- 旧ドメイン `lastfire-idle.vercel.app` も同じデプロイを指している
- ログインの目的は**セーブのクラウド保存だけ**。ログインしなくても遊べる

## 使っているもの

- `firebase` JS SDK **12.17.0**（モジュラー）
- **Firebase Authentication**（Google プロバイダのみ）
- **Cloud Firestore**（Standard エディション、`(default)`、`asia-northeast1`）
- Firebase プロジェクト: `working-planet`（Spark プラン）

### Firebase 側の設定（すべて設定済み）

- Authentication → Sign-in method → **Google 有効**
- Authentication → Settings → 承認済みドメイン:
  `localhost` / `working-planet.firebaseapp.com` / `working-planet.hitobito.jp` / `lastfire-idle.vercel.app`
- Firestore ルール（公開済み）:

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /saves/{uid} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
  ```

- firebaseConfig（公開値。コードに直接埋め込み。環境変数は使っていない）

  ```js
  {
    apiKey: "AIzaSyBDjwDlVG51mrZCIYWH1v0CrtqR3AYEs-k",
    authDomain: "working-planet.firebaseapp.com",
    projectId: "working-planet",
    storageBucket: "working-planet.firebasestorage.app",
    messagingSenderId: "299273365543",
    appId: "1:299273365543:web:f5ce35b6bc35bb83140602"
  }
  ```

### Google Cloud（OAuth クライアント）

リクエストに出ているクライアント ID:
`299273365543-uejh6r5f2q86dmuca47roomaep0nktcd.apps.googleusercontent.com`
（コンソール上の名前は `Web client (auto created by Google Service)`。同一 ID であることを確認済み）

- 承認済みの JavaScript 生成元
  - `http://localhost`
  - `http://localhost:5000`
  - `https://working-planet.firebaseapp.com`
  - `https://working-planet.hitobito.jp` ← 追加した
- 承認済みのリダイレクト URI
  - `https://working-planet.firebaseapp.com/__/auth/handler`
  - `https://working-planet.hitobito.jp/__/auth/handler` ← 追加した

保存済み。画面には「設定が有効になるまで 5 分から数時間かかることがあります」と表示される。

## 症状

### パソコン（Chrome / macOS）

`signInWithPopup` + `authDomain: working-planet.firebaseapp.com` で**成功**。
Firestore の `saves/{uid}` にセーブが書き込まれることまで確認済み。

### スマホ（iPhone / iOS Safari）

1. **`authDomain` が `working-planet.firebaseapp.com` のまま `signInWithRedirect` を使った場合**
   - Google のアカウント選択には進む
   - 戻ってくるが**ログインされていない**。`onAuthStateChanged` は `null` のまま
   - **エラーも出ない**（`getRedirectResult()` も投げない）。画面が一瞬暗くなって元に戻るだけ
   - iOS Safari の cross-site storage 制限が原因と推測している

2. **自ドメインに認証の受け口を置いた場合**（下記の対策）
   - Google 側で **`エラー 400: redirect_uri_mismatch`**
   - リクエスト詳細（実際の値）:

     ```
     access_type=online
     scope=openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile
     response_type=code
     redirect_uri=https://working-planet.hitobito.jp/__/auth/handler
     flowName=GeneralOAuthFlow
     client_id=299273365543-uejh6r5f2q86dmuca47roomaep0nktcd.apps.googleusercontent.com
     context_uri=https://working-planet.hitobito.jp
     ```

   - `redirect_uri` は OAuth クライアントに登録した文字列と**完全一致**している
   - 登録直後〜1時間程度では解消していない（反映待ちなのか、別の原因なのかが不明）

## 対策として入れているコード

### `next.config.ts` — 認証の受け口を自ドメインに中継

```ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://working-planet.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};
```

### `lib/firebase.ts` — 端末で `authDomain` を切り替え

```ts
const sameSiteHost = () =>
  typeof window !== "undefined" &&
  window.location.hostname === "working-planet.hitobito.jp";

const onPhone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints ?? 0) > 0);

export const redirectLogin = () => onPhone();

const authDomain = () =>
  sameSiteHost() && onPhone() ? window.location.hostname : config.authDomain;

// initializeApp({ ...config, authDomain: authDomain() })
```

### `lib/cloud.ts` — ログイン処理

```ts
export const signIn = async () => {
  const auth = authClient();
  const provider = new GoogleAuthProvider();

  if (redirectLogin()) {              // スマホ
    await signInWithRedirect(auth, provider);
    return;
  }
  try {                               // パソコン
    await signInWithPopup(auth, provider);
  } catch (error) {
    // popup 系のエラーなら signInWithRedirect にフォールバック
  }
};

// 画面が出たら一度だけ
getRedirectResult(auth).catch(showReason);
onAuthStateChanged(auth, (user) => { /* ... */ });
```

- 永続化は既定のまま（`browserLocalPersistence`）。明示的な `setPersistence` は呼んでいない
- `getRedirectResult` は `onAuthStateChanged` の登録前に一度だけ呼んでいる
- セーブは `saves/{uid}` に 1 ドキュメント。ログイン時に端末とクラウドの `savedAt` を比べて新しい方を採用

## これまでに潰した原因

- `auth/api-key-not-valid`: Vercel の環境変数に入れた値が壊れていた。→ 環境変数をやめて firebaseConfig をコードに直書きし、解消
- 承認済みドメインの登録漏れ → 追加済み
- Firestore 未作成 → 作成済み（ルールも公開済み）
- OAuth クライアントの取り違え → リクエストの `client_id` と編集した画面のクライアント ID が一致することを確認済み

## 聞きたいこと

1. iOS Safari で Firebase Auth の `signInWithRedirect` を成立させるのに、
   **Next.js（Vercel）の rewrites による `/__/auth/*` の中継**は十分か。
   Firebase Hosting を使わない場合の正しい実装は何か
   （POST で戻る `/__/auth/handler` や `/__/auth/iframe` が、rewrite 経由で正しく動くのか）
2. `redirect_uri_mismatch` が「登録済みなのに出続ける」場合に、
   反映待ち以外で疑うべき点はあるか（OAuth 同意画面の承認済みドメイン、ブランド設定、公開ステータスなど）
3. そもそも iOS Safari では、`signInWithRedirect` ではなく
   **Google Identity Services で ID トークンを取り、`signInWithCredential` に渡す**方が確実か。
   その場合の最小構成と、必要な Google Cloud 側の設定
4. `authDomain` を自ドメインに変えたとき、
   Firebase Auth 側で追加で必要になる設定（Cookie・CORS・Firebase Hosting の要否など）はあるか

## 制約

- Firebase の **Spark（無料）プラン**のまま使いたい
- Supabase への移行は不可（無料枠が使えないため）
- ホスティングは Vercel のまま（Firebase Hosting は使っていない）
