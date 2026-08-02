"use client";

import { useCallback, useState } from "react";
import Shop, { type Sample } from "@/components/Shop";
import { OFFLINE_CAP_HOURS, type OfflineReport } from "@/lib/shop";
import { resetState } from "@/lib/shopStore";
import { formatDuration, formatYen } from "@/lib/format";
import { setMuted, unlockAudio } from "@/lib/sfx";

export default function Page() {
  const [sample, setSample] = useState<Sample | null>(null);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState<OfflineReport | null>(null);

  const handleSample = useCallback((next: Sample) => {
    setSample(next);
    if (next.offline) setOffline(next.offline);
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("お店を最初から建て直しますか？")) return;
    resetState();
    window.location.reload();
  }, []);

  const money = sample?.money ?? 0;
  const mute = sample?.muted ?? false;

  const toggleMute = () => {
    unlockAudio();
    setMuted(!mute);
  };

  return (
    <main className="app">
      <header className="hud">
        <div className="wallet">
          <span className="wallet-icon">💴</span>
          <strong>
            {money.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
          </strong>
          <small>円</small>
        </div>
        <div className="hud-right">
          <span className="chip">🍜 {sample?.served ?? 0}杯</span>
          <span className="chip">👥 {sample?.staff ?? 0}人</span>
          <button
            type="button"
            className="chip-button"
            onClick={toggleMute}
            aria-label={mute ? "音を出す" : "音を消す"}
          >
            {mute ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            className="chip-button"
            onClick={() => setHelp(true)}
          >
            ？
          </button>
        </div>
      </header>

      <Shop onSample={handleSample} paused={help || offline !== null} />

      <footer className="dock">
        <div className="carry">
          <span>🍜</span>
          <strong>
            {sample?.carry ?? 0}
            <small> / {sample?.maxCarry ?? 3}</small>
          </strong>
          <small className="carry-note">運べる数</small>
        </div>
        <p className="dock-note">
          緑の枠に立つと買えます・長押しで説明
        </p>
      </footer>

      {sample && sample.served === 0 ? (
        <p className="hint">画面をスワイプして移動</p>
      ) : null}

      {sample?.toast ? <div className="toast">{sample.toast}</div> : null}

      {help ? (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="閉じる"
            onClick={() => setHelp(false)}
          />
          <section className="sheet">
            <div className="sheet-head">
              <h2>遊びかた</h2>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setHelp(false)}
              >
                ✕
              </button>
            </div>
            <ul className="notes">
              <li>画面のどこでもスワイプすると、その方向へ店主が歩きます（PCは矢印キー）。</li>
              <li>
                <strong>何でも長押しすると説明が出ます</strong>。緑の枠・寸胴・席・店員・
                お客さん・自分。値段や効果、次のレベルで何がどう変わるかも読めます。
              </li>
              <li>画面の中央に「次にやること」が出て、金色の点線がその場所まで伸びます。</li>
              <li>厨房の寸胴には丼が溜まります。近づくと自動で持ち上がります。</li>
              <li>
                お客さんが座ると、カウンターの<strong>配膳口が金色に光ります</strong>。
                そこまで運べば自動で出します。出した丼は輪が尽きるまで残ります。
              </li>
              <li>食べ終わったお客さんが置いたお金は、踏むと回収できます。</li>
              <li>
                <strong>買い物はすべて緑の枠</strong>です。立っているあいだお金が吸い出され、
                払い終わると手に入ります。メニュー画面はありません。
              </li>
              <li>
                <strong>厨房の中</strong>には強化の枠（両手鍋・厨房シューズ・業務用寸胴・看板メニュー）が
                並んでいます。何度でも強化でき、そのたびに値段が上がります。
              </li>
              <li>
                寸胴の奥で<strong>調理人</strong>を雇うと、その寸胴の調理が2.2倍速くなります。
              </li>
              <li>
                入口側の枠で<strong>ホール店員</strong>や<strong>配膳ロボ</strong>を雇うと、
                丼を運ぶ仕事を自分の代わりにやってくれます。ロボは足が速く、たくさん持てます。
                <strong>レジ係</strong>はお金を拾ってくれます。
              </li>
              <li>
                運ぶ人が1人でもいれば、閉じているあいだも最大{OFFLINE_CAP_HOURS}時間ぶん稼いでくれます。
              </li>
            </ul>
            <button type="button" className="ghost" onClick={handleReset}>
              最初からやり直す
            </button>
          </section>
        </>
      ) : null}

      {offline ? (
        <div className="modal" role="dialog" aria-modal>
          <div className="modal-card">
            <h2>ただいま！</h2>
            <p>
              閉じていた {formatDuration(offline.seconds)} のあいだ、
              店員がお店を回してくれました。
            </p>
            <div className="offline-earn">
              <span>💴</span>
              <strong>+{formatYen(offline.earned)}</strong>
            </div>
            <button type="button" onClick={() => setOffline(null)}>
              受け取る
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
