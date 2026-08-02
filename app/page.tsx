"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Shop, { type Sample } from "@/components/Shop";
import { OFFLINE_CAP_HOURS, type OfflineReport } from "@/lib/shop";
import {
  equipSkin,
  equippedSkin,
  ownedSkins,
  pullGacha,
  resetState,
  stageProgress,
  stageUnlocked,
  switchStage,
  type GachaResult,
} from "@/lib/shopStore";
import { GACHA_COST, GACHA_REFUND, rarityLabel, skins } from "@/data/skins";
import { stageDefs, stageList, type StageId } from "@/data/stages";
import { formatDuration, formatYen } from "@/lib/format";
import { setMuted, unlockAudio } from "@/lib/sfx";

const noop = () => () => {};

/** サーバー描画とずれないように、保存データは画面に出てから読む */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export default function Page() {
  const mounted = useMounted();
  const [view, setView] = useState<"top" | "play">("top");
  const [stageId, setStageId] = useState<StageId>("ramen");
  const [sample, setSample] = useState<Sample | null>(null);
  const [help, setHelp] = useState(false);
  const [gacha, setGacha] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [wearing, setWearing] = useState("default");
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

  const refreshSkins = useCallback(() => {
    setOwned([...ownedSkins()]);
    setWearing(equippedSkin().id);
  }, []);

  const openGacha = useCallback(() => {
    refreshSkins();
    setResult(null);
    setGacha(true);
  }, [refreshSkins]);

  const handlePull = useCallback(() => {
    const got = pullGacha();
    if (!got) return;
    setResult(got);
    refreshSkins();
  }, [refreshSkins]);

  const handleEquip = useCallback(
    (id: string) => {
      equipSkin(id);
      setWearing(id);
    },
    [],
  );

  const start = useCallback((id: StageId) => {
    switchStage(id);
    setStageId(id);
    setSample(null);
    setView("play");
  }, []);

  const money = sample?.money ?? 0;
  const mute = sample?.muted ?? false;

  if (view === "top") {
    return (
      <main className="top">
        <header className="top-head">
          <a className="portal-link" href="https://hitobito.jp">
            ← ひとびと
          </a>
          <h1>
            <span className="top-mark">🍜</span>
            はんじょうダッシュ
          </h1>
          <p>スワイプで動かして、お店とパークを大きくしていく放置ゲーム</p>
        </header>

        <ul className="stages">
          {stageList.map((def) => {
            const open = mounted ? stageUnlocked(def.id) : def.requiresAreas === 0;
            const progress = mounted
              ? stageProgress(def.id)
              : { started: false, money: 0, served: 0, areas: 1, totalAreas: def.areas.length };
            return (
              <li
                key={def.id}
                className={`stage-card stage-${def.id}${open ? "" : " is-locked"}`}
              >
                <div className="stage-art" aria-hidden>
                  {def.id === "ramen" ? "🍜" : "🎡"}
                </div>
                <div className="stage-body">
                  <strong>{def.name}</strong>
                  <p>{def.subtitle}</p>
                  {open ? (
                    <span className="stage-progress">
                      {progress.started
                        ? `区画 ${progress.areas}/${progress.totalAreas}・${progress.served.toLocaleString("ja-JP")}人`
                        : "はじめから"}
                    </span>
                  ) : (
                    <span className="stage-progress">
                      🔒 ラーメン一直線で区画を{stageDefs[def.id].requiresAreas}つ開けると解禁
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="stage-go"
                  disabled={!open}
                  onClick={() => start(def.id)}
                >
                  {progress.started ? "つづき" : "はじめる"}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="top-note">
          記録はこの端末に保存されます。ステージごとに別々に進みます。
        </p>
        <a className="portal-foot" href="https://hitobito.jp">
          ひとびとの他のアプリを見る →
        </a>
      </main>
    );
  }

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
          <button
            type="button"
            className="chip-button"
            onClick={() => {
              setView("top");
              setSample(null);
            }}
            aria-label="ステージ選択へ"
          >
            ☰
          </button>
          <span className="chip">
            🍜 {(sample?.served ?? 0).toLocaleString("ja-JP")}
          </span>
          <button
            type="button"
            className={`chip-button${money >= GACHA_COST ? " is-ready" : ""}`}
            onClick={openGacha}
            aria-label="ガチャ"
          >
            🎁
          </button>
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

      <Shop
        key={stageId}
        onSample={handleSample}
        paused={help || offline !== null}
      />

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
              <li>
                工事中の柵の手前にある大きな枠を買うと、<strong>店そのものが広がります</strong>。
                下（テーブル席）にも右（製麺所）にも増築でき、
                広がったぶんは画面が店主を追って縦横にスクロールします。
              </li>
              <li>
                広げた先では<strong>新しい設備と店員</strong>が入ります。
                製麺所には製麺機と大型冷蔵庫、宴会場には板前がいます。
              </li>
              <li>
                入口から出ると<strong>店の外（歩道）</strong>です。ここに
                <strong>券売機</strong>と<strong>呼び込み看板</strong>を置けます。
                お客さんはこの通りから歩いてきます。
              </li>
              <li>
                券売機を入れるとお金は自動で入るので、
                <strong>雇っていたレジ係はホール店員に配置転換</strong>されます（無駄になりません）。
              </li>
            </ul>
            <button type="button" className="ghost" onClick={handleReset}>
              最初からやり直す
            </button>
          </section>
        </>
      ) : null}

      {gacha ? (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="閉じる"
            onClick={() => setGacha(false)}
          />
          <section className="sheet">
            <div className="sheet-head">
              <h2>ガチャ</h2>
              <span className="sheet-money">{formatYen(money)}</span>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setGacha(false)}
              >
                ✕
              </button>
            </div>

            <p className="gacha-note">
              1回 {formatYen(GACHA_COST)}。店主の見た目が当たります。
              同じものが出たら {formatYen(GACHA_REFUND)} 返ってきます。
            </p>

            {result ? (
              <div className={`gacha-result rarity-${result.skin.rarity}`}>
                <span className="gacha-rarity">
                  {rarityLabel[result.skin.rarity]}
                </span>
                <strong>{result.skin.name}</strong>
                <small>
                  {result.duplicate
                    ? `ダブり ・ ${formatYen(GACHA_REFUND)} 返金`
                    : "着替えました！"}
                </small>
              </div>
            ) : null}

            <button
              type="button"
              className="gacha-pull"
              disabled={money < GACHA_COST}
              onClick={handlePull}
            >
              {money < GACHA_COST
                ? `あと ${formatYen(GACHA_COST - money)}`
                : `引く（${formatYen(GACHA_COST)}）`}
            </button>

            <h3 className="gacha-sub">
              持っている見た目 {owned.length} / {skins.length}
            </h3>
            <ul className="skins">
              {skins.map((skin) => {
                const have = owned.includes(skin.id);
                return (
                  <li
                    key={skin.id}
                    className={`skin rarity-${skin.rarity}${have ? "" : " is-locked"}${
                      wearing === skin.id ? " is-on" : ""
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!have}
                      onClick={() => handleEquip(skin.id)}
                    >
                      <span
                        className="skin-chip"
                        style={{ background: have ? skin.coat : "#3a3229" }}
                      />
                      <span className="skin-name">{have ? skin.name : "？？？"}</span>
                      <span className="skin-rarity">{skin.rarity}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
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
