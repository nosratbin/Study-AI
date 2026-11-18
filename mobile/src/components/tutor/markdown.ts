/**
 * A small Markdown parser for tutor replies: paragraphs, headings, bullet and numbered lists, fenced code,
 * and inline bold/italic (nestable), code and https links. Anything else stays as plain text. No dependency on purpose.
 * Emphasis needs word boundaries for both `*` and `_`, so `x*y*z`, `2 * 3` and snake_case stay literal.
 */

export type Inline =
  | { type: "text"; text: string; bold?: boolean; italic?: boolean }
  | { type: "code"; text: string }
  /** Only https links become links. `host` is shown next to the label, because the label comes from the LLM. */
  | { type: "link"; text: string; url: string; host: string; bold?: boolean; italic?: boolean };

export type Block =
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "heading"; inlines: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: Inline[][] }
  | { type: "code"; text: string };

type Style = { bold?: boolean; italic?: boolean };

const ESCAPABLE = "\`*_[]()#+-.!";
const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{M}\p{N}]/u.test(c);
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);

/** The host of an https URL (userinfo dropped, lower-cased), or null when the URL isn't plain https. */
export function httpsHost(url: string): string | null {
  const m = /^https:\/\/([^/?#\s]+)/i.exec(url.trim());
  if (!m) return null;
  const host = m[1].slice(m[1].lastIndexOf("@") + 1).toLowerCase();
  return host || null;
}

/** What a link shows: its label plus the host it really opens, unless the label already is the URL or the host. */
export function linkDisplay(text: string, url: string, host: string): { label: string; host: string | null } {
  const t = text.trim().toLowerCase().replace(/\/+$/, "");
  const same = t === host || t === url.trim().toLowerCase().replace(/\/+$/, "") || t === `www.${host}` || `www.${t}` === host;
  return { label: text, host: same ? null : host };
}

function push(out: Inline[], text: string, style: Style) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.type === "text" && !!last.bold === !!style.bold && !!last.italic === !!style.italic) {
    last.text += text;
    return;
  }
  const node: Inline = { type: "text", text };
  if (style.bold) node.bold = true;
  if (style.italic) node.italic = true;
  out.push(node);
}

/** Index of the closing delimiter, or -1. A closer follows a non-space and is not followed by a word character. */
function findCloser(src: string, from: number, delim: string): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "`") {
      const end = src.indexOf("`", i + 1);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (src.startsWith(delim, i) && i > from && !isSpace(src[i - 1])) {
      const doubled = delim.length === 1 && src[i + 1] === delim;
      if (doubled) {
        // Skip a nested `**` pair while looking for a single `*`.
        i += 2;
        continue;
      }
      if (!isWordChar(src[i + delim.length])) return i;
    }
    i++;
  }
  return -1;
}

export function parseInline(src: string, style: Style = {}): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === "\\" && ESCAPABLE.includes(src[i + 1] ?? "")) {
      push(out, src[i + 1], style);
      i += 2;
      continue;
    }

    if (c === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i + 1) {
        out.push({ type: "code", text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (c === "[") {
      const close = src.indexOf("]", i + 1);
      if (close !== -1 && src[close + 1] === "(") {
        const paren = src.indexOf(")", close + 2);
        if (paren !== -1) {
          const label = src.slice(i + 1, close);
          const url = src.slice(close + 2, paren).trim().split(/\s+/)[0] ?? "";
          const host = httpsHost(url);
          const text = parseInline(label)
            .map((n) => n.text)
            .join("");
          if (host) {
            const node: Inline = { type: "link", text: text || url, url, host };
            if (style.bold) node.bold = true;
            if (style.italic) node.italic = true;
            out.push(node);
          } else {
            // Not https: show the label as plain text, never tappable.
            push(out, text, style);
          }
          i = paren + 1;
          continue;
        }
      }
    }

    if (c === "*" || c === "_") {
      const double = src[i + 1] === c;
      const delim = double ? c + c : c;
      const canOpen = !isSpace(src[i + delim.length]) && !isWordChar(src[i - 1]);
      if (canOpen) {
        const end = findCloser(src, i + delim.length, delim);
        if (end !== -1) {
          const next: Style = double ? { ...style, bold: true } : { ...style, italic: true };
          for (const n of parseInline(src.slice(i + delim.length, end), next)) {
            if (n.type === "text") push(out, n.text, { bold: n.bold, italic: n.italic });
            else out.push(n);
          }
          i = end + delim.length;
          continue;
        }
      }
      push(out, delim, style);
      i += delim.length;
      continue;
    }

    push(out, c, style);
    i++;
  }
  return out;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
// Closing hashes only count when whitespace precedes them, so "## Learning C#" keeps its "#".
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/;
const FENCE = /^\s*```/;

type Draft = Exclude<Block, { type: "list" }> | { type: "list"; ordered: boolean; start: number; raw: string[] };

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Draft[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", inlines: parseInline(para.join("\n")) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (FENCE.test(line)) {
      flushPara();
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushPara();
      blocks.push({ type: "heading", inlines: parseInline(heading[1]) });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      flushPara();
      const isOrdered = !!ordered;
      const prev = blocks[blocks.length - 1];
      const text = bullet ? bullet[1] : ordered![2];
      if (prev?.type === "list" && prev.ordered === isOrdered) prev.raw.push(text);
      else blocks.push({ type: "list", ordered: isOrdered, start: ordered ? Number(ordered[1]) : 1, raw: [text] });
      continue;
    }

    if (!line.trim()) {
      flushPara();
      continue;
    }

    // An indented line right after a list item continues that item.
    const prev = blocks[blocks.length - 1];
    if (!para.length && prev?.type === "list" && /^\s{2,}\S/.test(line) && i > 0 && lines[i - 1].trim()) {
      prev.raw[prev.raw.length - 1] += ` ${line.trim()}`;
      continue;
    }
    para.push(line);
  }
  flushPara();
  return blocks.map((b) => (b.type === "list" ? { type: "list", ordered: b.ordered, start: b.start, items: b.raw.map((r) => parseInline(r)) } : b));
}

/** Plain text of a reply, for screen-reader announcements and copying. */
export function plainText(src: string): string {
  return parseMarkdown(src)
    .map((b) => {
      if (b.type === "code") return b.text;
      if (b.type === "list") return b.items.map((it) => it.map((n) => n.text).join("")).join("\n");
      return b.inlines.map((n) => n.text).join("");
    })
    .join("\n");
}
