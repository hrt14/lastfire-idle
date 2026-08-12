"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Shop, { type Sample } from "@/components/Shop";
import Feedback from "@/components/Feedback";
import { OFFLINE_CAP_HOURS, type OfflineReport } from "@/lib/shop";
import {
  allTierProgress,
  equipSkin,
  equippedSkin,
  ownedSkins,
  pullGacha,
  skinStars,
  resetState,
  stageProgress,
  stageUnlocked,
  switchStage,
  type GachaResult,
  type TierProgress,
} from "@/lib/shopStore";
import {
  MAX_STARS,
  gachaTierById,
  gachaTiers,
  rarityLabel,
  shineBonus,
  shineLabel,
  skins,
  tierPool,
  type Tier,
} from "@/data/skins";
import { planetStages, stageDefs, stageList, type StageId } from "@/data/stages";
import { TECHS } from "@/lib/moji";
import { HANDS_PER_POP, JOBS, JOB_STEP, moveHand, type Job } from "@/lib/taiga";
import { getState } from "@/lib/shopStore";
import { formatDuration, formatExact, formatMoney } from "@/lib/format";
import { setMuted, unlockAudio } from "@/lib/sfx";
import { setBgmMuted } from "@/lib/bgm";
import {
  cloudReady,
  cloudState,
  signIn,
  signOutAccount,
  startCloud,
  watchCloud,
} from "@/lib/cloud";

const noop = () => () => {};

/** サーバー描画とずれないように、保存データは画面に出てから読む */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** その段がもう開いているか（読み込んだ進みぐあいから引く） */
const tierOpenIn = (list: TierProgress[], tier: Tier) =>
  list.find((item) => item.tier === tier)?.open ?? false;

const cloudSnapshot = () => cloudState();
// サーバー描画側のスナップショットは、毎回同じものを返す（作り直すと再描画が止まらない）
const serverCloud = { account: null, status: "off" as const, note: "", at: 0 };
const cloudServer = () => serverCloud;

export default function Page() {
  const mounted = useMounted();
  const cloud = useSyncExternalStore(watchCloud, cloudSnapshot, cloudServer);
  const [view, setView] = useState<"top" | "play">("top");
  const [stageId, setStageId] = useState<StageId>("ramen");
  const [sample, setSample] = useState<Sample | null>(null);
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  /** リセットの確認。既定はキャンセル（この画面を開いただけでは消えない） */
  const [confirmReset, setConfirmReset] = useState(false);
  const [gacha, setGacha] = useState(false);
  /** 人手の割りふりシート（大河の文明の第6区画から） */
  const [crew, setCrew] = useState(false);
  const [scribe, setScribe] = useState(false);
  const [tier, setTier] = useState<Tier>(1);
  const [tiers, setTiers] = useState<TierProgress[]>([]);
  /** 上の段が開いた瞬間の演出（1回だけ） */
  const [unlockedTier, setUnlockedTier] = useState<Tier | null>(null);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [wearing, setWearing] = useState("default");
  const [stars, setStars] = useState<Record<string, number>>({});
  const [offline, setOffline] = useState<OfflineReport | null>(null);
  /** ウォレットを押すと、省略なしの金額をポップオーバーで出す */
  const [showExact, setShowExact] = useState(false);
  const walletRef = useRef<HTMLDivElement | null>(null);

  const handleSample = useCallback((next: Sample) => {
    setSample(next);
    if (next.offline) setOffline(next.offline);
  }, []);

  const handleReset = useCallback(() => {
    resetState();
    window.location.reload();
  }, []);

  const refreshSkins = useCallback(() => {
    const list = [...ownedSkins()];
    setOwned(list);
    setWearing(equippedSkin().id);
    setStars(Object.fromEntries(list.map((id) => [id, skinStars(id)])));
    setTiers(allTierProgress());
  }, []);

  const openGacha = useCallback(() => {
    refreshSkins();
    setResult(null);
    setUnlockedTier(null);
    setGacha(true);
  }, [refreshSkins]);

  const handlePull = useCallback(
    (at: Tier) => {
      const got = pullGacha(at);
      if (!got) return;
      setResult(got);
      if (got.unlockedTier) setUnlockedTier(got.unlockedTier);
      refreshSkins();
    },
    [refreshSkins],
  );

  const handleEquip = useCallback(
    (id: string) => {
      equipSkin(id);
      setWearing(id);
    },
    [],
  );

  /**
   * 人手をひとり動かす。
   * ゲームの状態はReactの外にあるので、そこを直接さわってから、
   * 見えている数字だけ先に合わせる（次のサンプルで正しい値が来る）
   */
  const handHand = useCallback((job: Job, delta: number) => {
    const state = getState();
    if (!moveHand(state, job, delta)) return;
    setSample((now) =>
      now && now.crew
        ? {
            ...now,
            crew: {
              ...now.crew,
              left: now.crew.left - delta,
              jobs: { ...now.crew.jobs, [job]: (now.crew.jobs[job] ?? 0) + delta },
            },
          }
        : now,
    );
  }, []);

  const starMark = (count: number) =>
    "★".repeat(count) + "☆".repeat(Math.max(0, MAX_STARS - count));

  /*
   * 金額のポップオーバーは、画面外タップ・Esc・時間切れで閉じる。
   * 長押しだけを必須操作にしない（キーボードでも開閉できる）
   */
  useEffect(() => {
    if (!showExact) return;
    const away = (event: PointerEvent) => {
      if (!walletRef.current?.contains(event.target as Node)) setShowExact(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowExact(false);
    };
    const timer = window.setTimeout(() => setShowExact(false), 4000);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [showExact]);

  const start = useCallback((id: StageId) => {
    switchStage(id);
    setStageId(id);
    setSample(null);
    // 開いているガチャの段を控えておく（🎁 が光るかどうかに使う）
    setTiers(allTierProgress());
    setView("play");
  }, []);

  const money = sample?.money ?? 0;
  const mute = sample?.muted ?? false;
  const bgmMuted = sample?.bgmMuted ?? false;
  const unit = stageDefs[stageId].currency ?? "円";
  const itemIcons: Record<string, string> = {
    food: "🍽️",
    goods: "🎁",
    meat: "🥩",
    log: "🪵",
    wood: "🪵",
    roast: "🍖",
    cut: "🥩",
    feast: "🍖",
    // 大河の文明
    water: "💧",
    seed: "🌱",
    grain: "🌾",
    flour: "🥣",
    bread: "🍞",
    grass: "🌿",
    milk: "🥛",
    wool: "🧶",
    fish: "🐟",
    dried: "🐟",
    clay: "🟤",
    pot: "🏺",
  };
  const carryIcon = sample?.item
    ? itemIcons[sample.item] ?? stageDefs[stageId].itemIcon
    : stageDefs[stageId].itemIcon;

  if (view === "top") {
    if (mounted) startCloud();
    const syncNote =
      cloud.status === "syncing"
        ? cloud.note || "同期中…"
        : cloud.status === "ok"
          ? "同期ずみ"
          : cloud.status === "error"
            ? cloud.note || "同期できませんでした"
            : "";
    return (
      <main className="top">
        <Feedback where="トップ" />
        <header className="top-head">
          <a className="portal-link" href="https://hitobito.jp">
            ← ひとびと
          </a>
          <h1>
            <span className="top-mark">🪐</span>
            ワーキングプラネット
          </h1>
          <p>働いて、街と星を大きくしていく放置ゲームのシリーズ</p>
        </header>

        {mounted && cloudReady() ? (
          <div className="account">
            {cloud.account ? (
              <>
                {cloud.account.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="account-face"
                    src={cloud.account.photo}
                    alt=""
                    width={28}
                    height={28}
                  />
                ) : (
                  <span className="account-face" aria-hidden>
                    👤
                  </span>
                )}
                <div className="account-body">
                  <strong>{cloud.account.name}</strong>
                  <small>{syncNote || "記録はアカウントに保存されます"}</small>
                </div>
                <button
                  type="button"
                  className="account-out"
                  onClick={() => void signOutAccount()}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <span className="account-face" aria-hidden>
                  ☁️
                </span>
                <div className="account-body">
                  <strong>記録を端末の外に残す</strong>
                  <small className={cloud.status === "error" ? "is-bad" : undefined}>
                    {syncNote || "ログインすると、別の端末でも続きから遊べます"}
                  </small>
                </div>
                <button
                  type="button"
                  className="account-in"
                  onClick={() => void signIn()}
                >
                  Google でログイン
                </button>
              </>
            )}
          </div>
        ) : null}

        <h2 className="series-head">
          <span aria-hidden>🏪</span> はんじょうダッシュ
        </h2>
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
                  {def.icon}
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
                      🔒 {stageDefs[stageDefs[def.id].requiresStage ?? "ramen"].name}
                      で区画を{stageDefs[def.id].requiresAreas}つ開けると解禁
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="stage-go"
                  disabled={!open}
                  onClick={() => start(def.id)}
                >
                  {!open ? "ロック中" : progress.started ? "つづき" : "はじめる"}
                </button>
              </li>
            );
          })}
        </ul>

        <h2 className="series-head">
          <span aria-hidden>♻️</span> SCRAP PLANET
        </h2>
        <ul className="stages">
          <li className="stage-card stage-scrap">
            <div className="stage-art" aria-hidden>
              🏭
            </div>
            <div className="stage-body">
              <strong>スクラップ工場</strong>
              <p>宇宙ゴミを加工し、ロボットで全工程を自動化</p>
              <span className="stage-progress">9段階の加工ライン・新登場</span>
            </div>
            <a className="stage-go" href="/scrap">
              はじめる
            </a>
          </li>
        </ul>

        <h2 className="series-head">
          <span aria-hidden>🦕</span> ワーキングプラネット
        </h2>
        <ul className="stages">
          {planetStages.map((def) => {
            const progress = mounted
              ? stageProgress(def.id)
              : { started: false, money: 0, served: 0, areas: 1, totalAreas: def.areas.length };
            return (
              <li key={def.id} className={`stage-card stage-${def.id}`}>
                <div className="stage-art" aria-hidden>
                  {def.icon}
                </div>
                <div className="stage-body">
                  <strong>{def.name}</strong>
                  <p>{def.subtitle}</p>
                  <span className="stage-progress">
                    {progress.started
                      ? `区画 ${progress.areas}/${progress.totalAreas}・${progress.served.toLocaleString("ja-JP")}人`
                      : "はじめから"}
                  </span>
                </div>
                <button
                  type="button"
                  className="stage-go"
                  onClick={() => start(def.id)}
                >
                  {progress.started ? "つづき" : "はじめる"}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="top-note" style={{ marginTop: "-4px" }}>
          原始からはじまる、時代がすすむシリーズ。しなものは何段もの工程を通って完成する。
        </p>


        <p className="top-note">
          記録はこの端末に保存されます。ログインすると、アカウントにも保存されます。
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

  const toggleBgm = () => {
    unlockAudio();
    setBgmMuted(!bgmMuted);
  };

  const gachaReady = tiers.some(
    (item) => item.open && money >= (gachaTierById.get(item.tier)?.cost ?? Infinity),
  );

  return (
    <main className="app">
      <header className="hud">
        {/*
          金額は短縮表記で出し、押すと正確な金額を小さなポップオーバーで見せる。
          HUD の幅は変わらないので、桁が増えても右のボタンが動かない（§10）
        */}
        <div className="wallet-slot" ref={walletRef}>
          <button
            type="button"
            className={`wallet${showExact ? " is-open" : ""}`}
            aria-expanded={showExact}
            aria-label={`所持金 ${formatExact(money, unit)}`}
            onClick={() => setShowExact((on) => !on)}
          >
            <span className="wallet-icon" aria-hidden>
              {unit === "貝" ? "🐚" : "💴"}
            </span>
            <strong>{formatMoney(money, "")}</strong>
            <small>{unit}</small>
          </button>
          {showExact ? (
            <div className="wallet-pop" role="status">
              {formatExact(money, unit)}
            </div>
          ) : null}
        </div>
        <div className="hud-right">
          <Feedback where={stageDefs[stageId].name} />
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
          <span className="chip" aria-label="提供した数">
            <i className="chip-mark" aria-hidden>
              {stageDefs[stageId].icon}
            </i>
            {formatMoney(sample?.served ?? 0, "")}
          </span>
          {sample?.crew ? (
            <button
              type="button"
              className={`chip-button${sample.crew.left > 0 ? " is-ready" : ""}`}
              onClick={() => setCrew(true)}
              aria-label="人手の割りふり"
            >
              👥
            </button>
          ) : null}
          {sample?.writing ? (
            <button
              type="button"
              className={`chip-button${
                sample.writing.confusion > 0.22 ? " is-ready" : ""
              }`}
              onClick={() => setScribe(true)}
              aria-label="文字と記録"
            >
              📖
            </button>
          ) : null}
          {sample?.writing ? (
            <span className="chip" aria-label="書き残した記録">
              <i className="chip-mark" aria-hidden>
                🪧
              </i>
              {formatMoney(sample.writing.records, "")}
            </span>
          ) : null}
          <button
            type="button"
            className={`chip-button${gachaReady ? " is-ready" : ""}`}
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
            onClick={toggleBgm}
            aria-label={bgmMuted ? "BGMを鳴らす" : "BGMを消す"}
          >
            {bgmMuted ? "🔕" : "🎶"}
          </button>
          {/* 遊びかたとリセットは、この設定シートの中にまとめてある */}
          <button
            type="button"
            className="chip-button"
            onClick={() => {
              setConfirmReset(false);
              setSettings(true);
            }}
            aria-label="設定・遊びかた"
          >
            ⚙
          </button>
        </div>
      </header>

      <Shop
        key={stageId}
        onSample={handleSample}
        paused={help || settings || offline !== null}
      />

      <footer className="dock">
        <div className="carry">
          <span>{carryIcon}</span>
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
                読み終わったら、画面をタップすると閉じます。
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
              <li>
                <strong>火のはじまり</strong>では、草原で動物を狩って生肉に、森で木を切って丸太に、
                丸太は薪割り場で薪にします。たき火は<strong>生肉と薪の両方</strong>を受け取って
                はじめて焼けます。薪割り場は人の手が要るので、
                <strong>薪割りを雇うまでは自分で立って割ります</strong>。
              </li>
              <li>
                <strong>はこび手</strong>は品種ごとに別の上限を持ちます。
                生肉を持ったままでも薪を拾えるので、片方の受け口が満杯でも工程は止まりません。
                1人では全区間を運びきれないので、足りなければ2人目を雇ってください。
              </li>
            </ul>
            <p className="notes-foot">
              このステージをやり直すときは、右上の <strong>⚙</strong> から。
            </p>
          </section>
        </>
      ) : null}

      {/* 設定。ステージのリセットはここに常設する（ヘルプの末尾だけに置かない） */}
      {crew && sample?.crew ? (
        <div className="scrim" onClick={() => setCrew(false)}>
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-head">
              <h2>人手の割りふり</h2>
              <span className="sheet-money">
                町の人 {sample.crew.pop}人
              </span>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setCrew(false)}
              >
                ✕
              </button>
            </div>
            <p className="crew-note">
              町の人が {HANDS_PER_POP}人 増えるごとに、任せられる手がひとつ増えます。
              残りは暮らしを回す手です。
              <strong>ぜんぶ仕事に出すと、町ぜんたいが少し鈍ります。</strong>
            </p>
            <p className={`crew-left${sample.crew.left === 0 ? " is-bad" : ""}`}>
              暮らしに残っている手 {sample.crew.left} / {sample.crew.hands}
            </p>
            <ul className="crew-list">
              {JOBS.map((job) => {
                const count = sample.crew?.jobs[job.id] ?? 0;
                return (
                  <li key={job.id}>
                    <div className="crew-body">
                      <strong>{job.label}</strong>
                      <p>{job.note}</p>
                      <span className="crew-gain">
                        +{Math.round(count * JOB_STEP * 100)}%
                      </span>
                    </div>
                    <div className="crew-pick">
                      <button
                        type="button"
                        onClick={() => handHand(job.id, -1)}
                        disabled={count <= 0}
                        aria-label={`${job.label}を減らす`}
                      >
                        −
                      </button>
                      <b>{count}</b>
                      <button
                        type="button"
                        onClick={() => handHand(job.id, 1)}
                        disabled={(sample.crew?.left ?? 0) <= 0}
                        aria-label={`${job.label}を増やす`}
                      >
                        ＋
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="ghost"
              onClick={() => setCrew(false)}
            >
              とじる
            </button>
          </section>
        </div>
      ) : null}

      {/* 文字の段階。数字ではなく「何ができるようになったか」で並べる */}
      {scribe && sample?.writing ? (
        <div className="scrim" onClick={() => setScribe(false)}>
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-head">
              <h2>文字と記録</h2>
              <span className="sheet-money">
                記録 {sample.writing.records.toLocaleString("ja-JP")}
              </span>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setScribe(false)}
              >
                ✕
              </button>
            </div>
            <p className="crew-note">
              書記が板に書きこむたび、街の<strong>記録</strong>が増えます。
              記録がたまると文字が一段すすみ、そのたびに街の見た目が変わります。
            </p>
            <p
              className={`crew-left${
                sample.writing.confusion > 0.22 ? " is-bad" : ""
              }`}
            >
              街のようす: {sample.writing.confusionText} ／ 書記{" "}
              {sample.writing.scribes}人・
              {sample.writing.short > 0
                ? `記録が ${sample.writing.short} 足りない`
                : "記録は追いついている"}
            </p>
            <ul className="crew-list">
              {TECHS.map((tech) => {
                const done = sample.writing!.level >= tech.level;
                const now = sample.writing!.level === tech.level;
                return (
                  <li key={tech.id}>
                    <div className="crew-body">
                      <strong>
                        {done ? "✓ " : ""}
                        {tech.name}
                        {now ? "（いま）" : ""}
                      </strong>
                      <p>{tech.means}</p>
                      <span className="crew-gain">{tech.effect}</span>
                    </div>
                    <div className="crew-pick">
                      <b>{done ? "—" : tech.records.toLocaleString("ja-JP")}</b>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="ghost"
              onClick={() => setScribe(false)}
            >
              とじる
            </button>
          </section>
        </div>
      ) : null}

      {settings ? (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="閉じる"
            onClick={() => setSettings(false)}
          />
          <section className="sheet">
            <div className="sheet-head">
              <h2>設定</h2>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setSettings(false)}
              >
                ✕
              </button>
            </div>

            <ul className="setting-list">
              <li>
                <div>
                  <strong>音</strong>
                  <small>効果音を鳴らすかどうか</small>
                </div>
                <button type="button" className="ghost" onClick={toggleMute}>
                  {mute ? "🔇 消音中" : "🔊 鳴らす"}
                </button>
              </li>
              <li>
                <div>
                  <strong>BGM</strong>
                  <small>場面に合わせた環境音・下敷きの音楽</small>
                </div>
                <button type="button" className="ghost" onClick={toggleBgm}>
                  {bgmMuted ? "🔕 消音中" : "🎶 鳴らす"}
                </button>
              </li>
              <li>
                <div>
                  <strong>遊びかた</strong>
                  <small>操作と仕組みの説明</small>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSettings(false);
                    setHelp(true);
                  }}
                >
                  ひらく
                </button>
              </li>
              <li>
                <div>
                  <strong>このステージをリセット</strong>
                  <small>
                    「{stageDefs[stageId].name}」だけを最初の状態に戻します
                  </small>
                </div>
                <button
                  type="button"
                  className="ghost is-danger"
                  onClick={() => setConfirmReset(true)}
                >
                  リセット
                </button>
              </li>
            </ul>
          </section>
        </>
      ) : null}

      {/* リセットの確認。何が消えて何が残るかを出し、既定はキャンセル */}
      {confirmReset ? (
        <div className="modal" role="dialog" aria-modal aria-labelledby="reset-title">
          <div className="modal-card">
            <h2 id="reset-title">
              「{stageDefs[stageId].name}」をリセットしますか？
            </h2>
            <div className="reset-cols">
              <div className="reset-col is-lost">
                <strong>消えるもの</strong>
                <ul>
                  <li>このステージの{unit}</li>
                  <li>雇った人（狩人・木こり・薪割り・はこび手など）</li>
                  <li>設備・席・区画</li>
                  <li>強化レベル</li>
                  <li>提供数と進行状況</li>
                </ul>
              </div>
              <div className="reset-col is-kept">
                <strong>残るもの</strong>
                <ul>
                  <li>ほかのステージの進行</li>
                  <li>持っているスキンと、装備中のスキン</li>
                  <li>音量などの全体設定</li>
                  <li>ログイン状態</li>
                </ul>
              </div>
            </div>
            <p className="reset-note">
              ほかのステージや、集めたスキンには手をつけません。
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost"
                autoFocus
                onClick={() => setConfirmReset(false)}
              >
                キャンセル
              </button>
              <button type="button" className="is-danger" onClick={handleReset}>
                リセットする
              </button>
            </div>
          </div>
        </div>
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
              <span className="sheet-money">{formatMoney(money, unit)}</span>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setGacha(false)}
              >
                ✕
              </button>
            </div>

            {/* 3つの価格帯。未解放のものも、値段と解放条件と進みぐあいを見せる */}
            <ul className="gacha-tiers">
              {gachaTiers.map((spec) => {
                const at = tiers.find((item) => item.tier === spec.tier);
                const open = at?.open ?? spec.tier === 1;
                const from = tiers.find(
                  (item) => item.next === spec.tier,
                );
                return (
                  <li key={spec.tier}>
                    <button
                      type="button"
                      className={`gacha-tier${tier === spec.tier ? " is-on" : ""}${
                        open ? "" : " is-locked"
                      }`}
                      disabled={!open}
                      onClick={() => {
                        setTier(spec.tier);
                        setResult(null);
                      }}
                    >
                      <strong>
                        {spec.name}
                        {unit}ガチャ
                      </strong>
                      <small>{formatMoney(spec.cost, unit)}／回</small>
                      {open ? (
                        <em>
                          {at?.owned ?? 0} / {at?.total ?? 0}種
                        </em>
                      ) : (
                        <em className="is-need">
                          🔒{" "}
                          {from
                            ? `${from.owned} / ${from.need}種で解放`
                            : "解放条件なし"}
                        </em>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {(() => {
              const spec = gachaTierById.get(tier)!;
              const at = tiers.find((item) => item.tier === tier);
              const nextSpec = at?.next ? gachaTierById.get(at.next) : null;
              const nextOpen = at?.next ? tierOpenIn(tiers, at.next) : true;
              const left = Math.max(0, (at?.need ?? 0) - (at?.owned ?? 0));
              return (
                <>
                  <p className="gacha-note">
                    1回 {formatMoney(spec.cost, unit)}。この価格帯のスキンだけが当たります
                    （ほかの価格帯のものは出ません）。
                    同じものが出ると★が増えて光り方が変わり、足の速さも上がります
                    （★1つ +5%・★{MAX_STARS} まで6段階）。
                    ★が上限のあとは {formatMoney(spec.refund, unit)} 返ってきます。
                  </p>

                  <p className="gacha-progress">
                    {spec.name}
                    {unit}ガチャのスキン {at?.owned ?? 0} / {at?.total ?? 0}
                    {nextSpec && !nextOpen
                      ? `（あと${left}種で ${nextSpec.name}${unit}ガチャ解放）`
                      : nextSpec
                        ? `（${nextSpec.name}${unit}ガチャ 解放ずみ）`
                        : "（最上位）"}
                    ・コンプ率{" "}
                    {Math.round(((at?.owned ?? 0) / Math.max(1, at?.total ?? 1)) * 100)}%
                  </p>

                  {unlockedTier ? (
                    <div className="gacha-unlocked" role="status">
                      🎉 {gachaTierById.get(unlockedTier)?.name}
                      {unit}ガチャが解放されました！
                    </div>
                  ) : null}

                  {result ? (
                    <div className={`gacha-result rarity-${result.skin.rarity}`}>
                      <span className="gacha-rarity">
                        {rarityLabel[result.skin.rarity]}
                      </span>
                      <strong>{result.skin.name}</strong>
                      {result.stars > 0 ? (
                        <span className="gacha-stars">{starMark(result.stars)}</span>
                      ) : null}
                      <small>
                        {result.shined
                          ? `ダブり ・ ★${result.stars} になった！ ${shineLabel(result.stars)}・足 +${shineBonus(result.stars)}%`
                          : result.refunded
                            ? `★は上限 ・ ${formatMoney(spec.refund, unit)} 返金`
                            : "着替えました！"}
                      </small>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="gacha-pull"
                    disabled={money < spec.cost}
                    onClick={() => handlePull(tier)}
                  >
                    {money < spec.cost
                      ? `あと ${formatMoney(spec.cost - money, unit)}`
                      : `引く（${formatMoney(spec.cost, unit)}）`}
                  </button>
                </>
              );
            })()}

            <h3 className="gacha-sub">
              持っている見た目 {owned.length - 1} / {skins.length - 1}
            </h3>
            {/* 一覧は価格帯ごとに分ける。未取得はシルエットで見せる */}
            {gachaTiers.map((spec) => {
              const at = tiers.find((item) => item.tier === spec.tier);
              return (
                <div key={spec.tier} className="skin-group">
                  <h4 className="skin-group-head">
                    {spec.name}
                    {unit}ガチャ
                    <span>
                      {at?.owned ?? 0} / {at?.total ?? 0}
                    </span>
                  </h4>
                  <ul className="skins">
                    {tierPool(spec.tier).map((skin) => {
                      const have = owned.includes(skin.id);
                      return (
                        <li
                          key={skin.id}
                          className={`skin rarity-${skin.rarity}${have ? "" : " is-locked"}${
                            wearing === skin.id ? " is-on" : ""
                          }${(stars[skin.id] ?? 0) > 0 ? " is-shining" : ""}${
                            (stars[skin.id] ?? 0) >= 3 ? " is-rainbow" : ""
                          }${(stars[skin.id] ?? 0) >= MAX_STARS ? " is-max" : ""}`}
                        >
                          <button
                            type="button"
                            disabled={!have}
                            onClick={() => handleEquip(skin.id)}
                          >
                            <span
                              className="skin-chip"
                              style={{ background: have ? skin.coat : "#3a3229" }}
                            >
                              {have && skin.icon ? skin.icon : null}
                            </span>
                            <span className="skin-name">
                              {have ? skin.name : "？？？"}
                            </span>
                            {have && (stars[skin.id] ?? 0) > 0 ? (
                              <span className="skin-stars">
                                ★{stars[skin.id] ?? 0}
                                <em>+{shineBonus(stars[skin.id] ?? 0)}%</em>
                              </span>
                            ) : (
                              <span className="skin-rarity">{skin.rarity}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {/* 無料の初期スキンは、どのガチャの分母にも入れない */}
            <p className="gacha-foot">
              「見習い」は最初から持っている無料スキンなので、どの価格帯の
              種類数にも数えません。
            </p>
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
              <span>{unit === "貝" ? "🐚" : "💴"}</span>
              <strong>+{formatMoney(offline.earned, unit)}</strong>
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
