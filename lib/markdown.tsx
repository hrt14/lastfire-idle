/**
 * docs/ のマークダウンを、そのまま画面に出すための小さな変換器。
 *
 * 仕様書を読むためだけのものなので、docs/ で実際に使っている書き方
 * ——見出し・段落・箇条書き・番号つき・表・コードブロック・区切り線と、
 * 行の中の **太字**・`コード`・[link](url) —— だけを扱う。
 * それ以外の記法はそのままの文字として出る。
 */

import type { ReactNode } from "react";

type Align = "left" | "right" | "center";

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; head: string[]; align: Align[]; rows: string[][] }
  | { kind: "code"; text: string }
  | { kind: "rule" };

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;
const RULE = /^(-{3,}|\*{3,})$/;
const FENCE = /^```/;

/** `| a | b |` を、前後の縦棒を落としたセルの並びにする */
const cells = (line: string) =>
  line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());

/** `|---|---:|` の行かどうか。表かどうかはこの2行目で決まる */
const isDivider = (line: string) =>
  /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");

const alignOf = (cell: string): Align =>
  cell.startsWith(":") && cell.endsWith(":")
    ? "center"
    : cell.endsWith(":")
      ? "right"
      : "left";

/** 本文を、上から順にかたまりへ切り分ける */
function parse(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (FENCE.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // 閉じの ```
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (RULE.test(line.trim())) {
      blocks.push({ kind: "rule" });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|") && isDivider(lines[i + 1] ?? "")) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map(alignOf);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i]));
        i += 1;
      }
      blocks.push({ kind: "table", head, align, rows });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      const ordered = !bullet;
      const items: string[] = [];
      while (i < lines.length) {
        const next = ordered ? NUMBERED.exec(lines[i]) : BULLET.exec(lines[i]);
        if (!next) break;
        // 折り返した続きの行（字下げ）は、同じ項目にくっつける
        let text = next[1];
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
          text += lines[i].trim();
          i += 1;
        }
        items.push(text);
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const next = lines[i];
      if (
        !next.trim() ||
        HEADING.test(next) ||
        RULE.test(next.trim()) ||
        FENCE.test(next) ||
        BULLET.test(next) ||
        NUMBERED.test(next) ||
        next.trim().startsWith("|")
      ) {
        break;
      }
      paragraph.push(next.trim());
      i += 1;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }

  return blocks;
}

/**
 * 読みやすさのために折り返してある段落を、1つづきの文へ戻す。
 * 日本語はそのままつなぎ、英数字どうしのあいだにだけ空白を入れる
 * （そうしないと、狭い画面で書き手の折り返しがそのまま改行として出る）。
 */
const ASCII_WORD = /[\w),.;:!?'"-]/;

const joinLines = (lines: string[]) =>
  lines.reduce((text, line) => {
    if (!text) return line;
    const before = text[text.length - 1];
    const after = line[0];
    return ASCII_WORD.test(before) && ASCII_WORD.test(after)
      ? `${text} ${line}`
      : text + line;
  }, "");

/** 行の中の **太字**・`コード`・[文字](url) を組み立てる */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = `${keyBase}-${n}`;
    n += 1;
    if (match[1]) {
      out.push(<strong key={key}>{match[1]}</strong>);
    } else if (match[2]) {
      out.push(<code key={key}>{match[2]}</code>);
    } else {
      const href = match[4];
      // docs のなかの相対リンク（./foo.md）は、まだ置き場がないので文字だけ出す
      const external = /^(https?:)?\/\//.test(href) || href.startsWith("/");
      out.push(
        external ? (
          <a key={key} href={href}>
            {match[3]}
          </a>
        ) : (
          <span key={key}>{match[3]}</span>
        ),
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** マークダウンの文字列を、そのまま置ける React の中身に変える */
export function renderMarkdown(source: string): ReactNode {
  return parse(source).map((block, index) => {
    const key = `b${index}`;
    switch (block.kind) {
      case "heading": {
        const Tag = (["h1", "h2", "h3"] as const)[block.level - 1];
        return <Tag key={key}>{inline(block.text, key)}</Tag>;
      }
      case "paragraph":
        return <p key={key}>{inline(joinLines(block.lines), key)}</p>;
      case "list": {
        const items = block.items.map((item, row) => (
          <li key={`${key}-${row}`}>{inline(item, `${key}-${row}`)}</li>
        ));
        return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
      }
      case "table":
        return (
          <div className="doc-table" key={key}>
            <table>
              <thead>
                <tr>
                  {block.head.map((cell, col) => (
                    <th key={`${key}-h${col}`} style={{ textAlign: block.align[col] }}>
                      {inline(cell, `${key}-h${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={`${key}-r${r}`}>
                    {row.map((cell, col) => (
                      <td key={`${key}-r${r}c${col}`} style={{ textAlign: block.align[col] }}>
                        {inline(cell, `${key}-r${r}c${col}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "code":
        return (
          <pre key={key}>
            <code>{block.text}</code>
          </pre>
        );
      case "rule":
        return <hr key={key} />;
    }
  });
}
