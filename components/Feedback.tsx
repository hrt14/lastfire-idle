"use client";

/**
 * どのページの右上にも出す、要望・フィードバックの受け口。
 * 書いてもらったものは端末にためておき、あとでまとめて開発に反映する。
 *
 * だいじなのは「このステージについて」なのか「システム全体について」なのかの区別。
 * それと、どのステージから送られたか（where）も一緒に記録する。
 * 「ぜんぶコピー」で、区別つきで全部コピーできる（開発へまとめて渡すため）。
 */

import { useState } from "react";

type Scope = "stage" | "system";

type Item = {
  at: number;
  text: string;
  /** ステージについてか、システム全体についてか */
  scope: Scope;
  /** どのステージから送られたか（トップなら「トップ」） */
  where?: string;
};

const KEY = "wp-feedback";

const read = (): Item[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Item[]) : [];
    if (!Array.isArray(list)) return [];
    // 古い記録（scope なし）は、ステージ名があればステージ、なければ全体とみなす
    return list.map((it) => ({
      ...it,
      scope: it.scope ?? (it.where && it.where !== "トップ" ? "stage" : "system"),
    }));
  } catch {
    return [];
  }
};

const write = (list: Item[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 保存できなくても、その場では送れた扱いにする
  }
};

const label = (it: Item) =>
  it.scope === "stage" && it.where ? `${it.where}について` : "システム全体について";

export default function Feedback({ where }: { where?: string }) {
  const onStage = !!where && where !== "トップ";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [scope, setScope] = useState<Scope>(onStage ? "stage" : "system");
  const [items, setItems] = useState<Item[]>([]);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const openSheet = () => {
    setItems(read());
    setScope(onStage ? "stage" : "system");
    setOpen(true);
  };

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    const item: Item = { at: Date.now(), text: body, scope, where };
    const list = [item, ...read()].slice(0, 100);
    write(list);
    setItems(list);
    setText("");
    setSent(true);
    window.setTimeout(() => setSent(false), 1800);
  };

  const copyAll = async () => {
    // ステージ別・システム全体でまとめてコピーする
    const list = read();
    const system = list.filter((it) => it.scope === "system");
    const byStage = new Map<string, Item[]>();
    for (const it of list.filter((it) => it.scope === "stage")) {
      const key = it.where ?? "（不明なステージ）";
      byStage.set(key, [...(byStage.get(key) ?? []), it]);
    }
    const block = (title: string, rows: Item[]) =>
      rows.length
        ? `【${title}】\n` +
          rows
            .map(
              (it) => `- ${it.text} [${new Date(it.at).toLocaleDateString("ja-JP")}]`,
            )
            .join("\n")
        : "";
    const parts = [
      block("システム全体", system),
      ...[...byStage.entries()].map(([stage, rows]) => block(stage, rows)),
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join("\n\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // クリップボードが使えない端末では、何もしない
    }
  };

  return (
    <>
      <button
        type="button"
        className="fb-button"
        onClick={openSheet}
        aria-label="要望・フィードバックを送る"
        title="要望・フィードバック"
      >
        📮
      </button>
      {open ? (
        <div className="fb-backdrop" onClick={() => setOpen(false)}>
          <div
            className="fb-sheet"
            role="dialog"
            aria-label="要望・フィードバック"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>要望・フィードバック</h3>
            <p className="fb-note">
              気づいたこと・ほしい機能をどうぞ。まとめて開発に反映します。
            </p>
            <div className="fb-scope">
              <span className="fb-scope-label">どれについて？</span>
              <div className="fb-scope-row">
                <button
                  type="button"
                  className={`fb-chip${scope === "stage" ? " is-on" : ""}`}
                  onClick={() => setScope("stage")}
                  disabled={!onStage}
                >
                  {onStage ? `${where}について` : "このステージについて"}
                </button>
                <button
                  type="button"
                  className={`fb-chip${scope === "system" ? " is-on" : ""}`}
                  onClick={() => setScope("system")}
                >
                  システム全体について
                </button>
              </div>
            </div>
            <textarea
              className="fb-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              placeholder="例: ○○の見た目をこうしたい、△△が分かりにくい…"
            />
            <div className="fb-row">
              <button type="button" className="fb-send" onClick={submit}>
                {sent ? "ありがとう！" : "送る"}
              </button>
              {items.length > 0 ? (
                <button type="button" className="fb-copy" onClick={copyAll}>
                  {copied ? "コピーした" : "ぜんぶコピー"}
                </button>
              ) : null}
            </div>
            {items.length > 0 ? (
              <>
                <p className="fb-sub">これまでの要望（{items.length}件）</p>
                <ul className="fb-list">
                  {items.map((it, index) => (
                    <li key={index}>
                      <span>{it.text}</span>
                      <small>{label(it)}</small>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <button
              type="button"
              className="fb-close"
              onClick={() => setOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
