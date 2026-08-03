"use client";

/**
 * どのページの右上にも出す、要望・フィードバックの受け口。
 * 書いてもらったものは端末にためておき、あとでまとめて開発に反映する。
 * 「ぜんぶコピー」で全部の要望をコピーできる（開発へまとめて渡すため）。
 */

import { useState } from "react";

type Item = { at: number; text: string; where?: string };

const KEY = "wp-feedback";

const read = (): Item[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Item[]) : [];
    return Array.isArray(list) ? list : [];
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

export default function Feedback({ where }: { where?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const openSheet = () => {
    setItems(read());
    setOpen(true);
  };

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    const list = [{ at: Date.now(), text: body, where }, ...read()].slice(0, 100);
    write(list);
    setItems(list);
    setText("");
    setSent(true);
    window.setTimeout(() => setSent(false), 1800);
  };

  const copyAll = async () => {
    const all = read()
      .map((it) => {
        const day = new Date(it.at).toLocaleDateString("ja-JP");
        return `- ${it.text}${it.where ? `（${it.where}）` : ""} [${day}]`;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(all);
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
                      {it.where ? <small>{it.where}</small> : null}
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
