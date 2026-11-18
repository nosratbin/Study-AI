/**
 * A small, safe markdown parser for lesson content (no dependency, no HTML). It covers what lessons use: headings,
 * paragraphs, bullet and numbered lists (with nesting by indent), bold/italic, inline code, fenced code blocks, links,
 * blockquotes, horizontal rules and simple pipe tables. Anything else renders as plain text, never as markup.
 * Pure TypeScript so it can be unit-tested without React Native.
 */

export type Inline =
  | { type: "text"; text: string; bold?: boolean; italic?: boolean }
  | { type: "code"; text: string }
  | { type: "link"; href: string | null; children: Inline[] }
  | { type: "image"; alt: string; src: string | null };

export type ListItem = { depth: number; ordered: boolean; number: number; content: Inline[] };

export type Block =
  | { type: "heading"; level: number; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | { type: "list"; items: ListItem[] }
  | { type: "code"; lang: string | null; text: string }
  | { type: "quote"; blocks: Block[] }
  | { type: "image"; alt: string; src: string | null }
  | { type: "hr" }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] };

type Style = { bold?: boolean; italic?: boolean };

/** Only web and mail links are opened; anything else (javascript:, relative paths) renders as plain text. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  return /^(https?:\/\/|mailto:)/i.test(h) ? h : null;
}

/** Images load only over https; anything else shows its alt text instead. */
export function safeImageSrc(src: string): string | null {
  const s = src.trim();
  return /^https:\/\/[^\s]+$/i.test(s) ? s : null;
}

const ESCAPABLE = "\\`*_{}[]()#+-.!|>~";
const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);

function pushText(out: Inline[], text: string, style: Style) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.type === "text" && !!last.bold === !!style.bold && !!last.italic === !!style.italic) {
    last.text += text;
    return;
  }
  const node: Inline = { type: "text", text };
  if (style.bold) node.bold = true;
  if (style.italic) node.italic = true;
  out.push(node);
}

/** Index of the closing emphasis delimiter, or -1. The closer can't follow whitespace; `_` must not sit inside a word. */
function findCloser(src: string, from: number, delim: string): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "`") {
      // Skip code spans: delimiters inside them don't count.
      const end = src.indexOf("`", i + 1);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (src.startsWith(delim, i) && !isSpace(src[i - 1]) && i > from) {
      // For single `*`/`_`, don't stop on half of a `**`/`__` pair.
      const doubled = delim.length === 1 && src[i + 1] === delim;
      const underscoreOk = delim[0] !== "_" || !isWordChar(src[i + delim.length]);
      if (!doubled && underscoreOk) return i;
      if (doubled) {
        i += 2;
        continue;
      }
    }
    i++;
  }
  return -1;
}

export function parseInline(src: string, style: Style = {}): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    pushText(out, buf, style);
    buf = "";
  };

  while (i < src.length) {
    const c = src[i];

    if (c === "\\" && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }

    if (c === "`") {
      let ticks = 1;
      while (src[i + ticks] === "`") ticks++;
      const fence = "`".repeat(ticks);
      const end = src.indexOf(fence, i + ticks);
      if (end !== -1) {
        flush();
        out.push({ type: "code", text: src.slice(i + ticks, end).replace(/^ (.*) $/, "$1") });
        i = end + ticks;
        continue;
      }
      buf += fence;
      i += ticks;
      continue;
    }

    if (c === "!" && src[i + 1] === "[") {
      const close = src.indexOf("]", i + 2);
      if (close !== -1 && src[close + 1] === "(") {
        const paren = src.indexOf(")", close + 2);
        if (paren !== -1) {
          flush();
          const target = src.slice(close + 2, paren).split(/\s+/)[0] ?? "";
          out.push({ type: "image", alt: src.slice(i + 2, close).trim(), src: safeImageSrc(target) });
          i = paren + 1;
          continue;
        }
      }
    }

    if (c === "[") {
      const close = src.indexOf("]", i + 1);
      if (close !== -1 && src[close + 1] === "(") {
        const paren = src.indexOf(")", close + 2);
        if (paren !== -1) {
          flush();
          const label = src.slice(i + 1, close);
          const href = src.slice(close + 2, paren).split(/\s+/)[0] ?? "";
          out.push({ type: "link", href: safeHref(href), children: parseInline(label, style) });
          i = paren + 1;
          continue;
        }
      }
    }

    if (c === "*" || c === "_") {
      const double = src[i + 1] === c;
      const delim = double ? c + c : c;
      const after = src[i + delim.length];
      // An opener must be followed by non-space; `_` must not start inside a word (snake_case stays literal).
      const canOpen = !isSpace(after) && (c !== "_" || !isWordChar(src[i - 1]));
      if (canOpen) {
        const end = findCloser(src, i + delim.length, delim);
        if (end !== -1) {
          flush();
          const inner = src.slice(i + delim.length, end);
          const next: Style = double ? { ...style, bold: true } : { ...style, italic: true };
          for (const node of parseInline(inner, next)) {
            if (node.type === "text") pushText(out, node.text, { bold: node.bold, italic: node.italic });
            else out.push(node);
          }
          i = end + delim.length;
          continue;
        }
      }
      buf += delim;
      i += delim.length;
      continue;
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}

/** Plain text of inline nodes (for accessibility labels and comparisons). */
export function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.type === "link" ? inlineText(n.children) : n.type === "image" ? n.alt : n.text)).join("");
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
// Closing hashes are stripped only after whitespace, so "## Learning C#" keeps its "#".
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const HR = /^ {0,3}([-*_])( *\1){2,} *$/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const QUOTE = /^ {0,3}>\s?(.*)$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  // Split on unescaped pipes.
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

const isTableStart = (lines: string[], i: number) => lines[i].includes("|") && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1]) && lines[i + 1].includes("-");

function startsBlock(lines: string[], i: number): boolean {
  const l = lines[i];
  return FENCE.test(l) || HEADING.test(l) || HR.test(l) || LIST.test(l) || QUOTE.test(l) || isTableStart(lines, i);
}

function indentWidth(ws: string): number {
  return ws.replace(/\t/g, "    ").length;
}

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const marker = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i].trim().startsWith(marker[0].repeat(marker.length)) && lines[i].trim().replace(/[`~]/g, "") === "")) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence (or end of input)
      blocks.push({ type: "code", lang: fence[2] || null, text: body.join("\n") });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, content: parseInline(heading[2]) });
      i++;
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(line).map((c) => parseInline(c));
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        const cells = splitRow(lines[i]).map((c) => parseInline(c));
        while (cells.length < header.length) cells.push([]);
        rows.push(cells.slice(0, header.length));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        const m = lines[i].match(QUOTE);
        inner.push(m ? m[1] : lines[i]);
        i++;
      }
      blocks.push({ type: "quote", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }

    if (LIST.test(line)) {
      const items: ListItem[] = [];
      const baseIndent = indentWidth(line.match(LIST)![1]);
      const counters: number[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(LIST);
        if (m) {
          const depth = Math.min(3, Math.max(0, Math.floor((indentWidth(m[1]) - baseIndent) / 2)));
          const ordered = /\d/.test(m[2]);
          counters.length = depth + 1;
          const number = ordered ? (counters[depth] === undefined ? parseInt(m[2], 10) : counters[depth] + 1) : 0;
          counters[depth] = number;
          items.push({ depth, ordered, number, content: parseInline(m[3].trim()) });
          i++;
          continue;
        }
        if (!l.trim()) {
          // A blank line continues the list only if another item follows.
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && LIST.test(lines[j])) {
            i = j;
            continue;
          }
          break;
        }
        if (/^\s+/.test(l) && items.length) {
          // Indented continuation line: part of the previous item.
          const last = items[items.length - 1];
          last.content = parseInline(`${inlineSource(last)} ${l.trim()}`);
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Paragraph: runs until a blank line or the start of another block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !startsBlock(lines, i))) {
      para.push(lines[i]);
      i++;
    }
    const text = para.map((l, k) => (k < para.length - 1 && / {2,}$/.test(l) ? `${l.trim()}\n` : `${l.trim()} `)).join("").trimEnd();
    const content = parseInline(text.replace(/\n /g, "\n"));
    // A paragraph that is just one image becomes a full-width image block.
    const solid = content.filter((n) => !(n.type === "text" && !n.text.trim()));
    if (solid.length === 1 && solid[0].type === "image") blocks.push({ type: "image", alt: solid[0].alt, src: solid[0].src });
    else blocks.push({ type: "paragraph", content });
  }
  return blocks;
}

/** Rebuild an approximate source string from parsed inlines (used to append continuation lines to a list item). */
function inlineSource(item: ListItem): string {
  const src = (nodes: Inline[]): string =>
    nodes
      .map((n) => {
        if (n.type === "code") return `\`${n.text}\``;
        if (n.type === "link") return `[${src(n.children)}](${n.href ?? ""})`;
        if (n.type === "image") return `![${n.alt}](${n.src ?? ""})`;
        let t = n.text;
        if (n.italic) t = `*${t}*`;
        if (n.bold) t = `**${t}**`;
        return t;
      })
      .join("");
  return src(item.content);
}

const normalise = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Lessons usually open with `# <lesson title>`, which the reader already shows as the page title.
 * Drop that first heading when it repeats the title, so it isn't shown twice.
 */
export function stripLeadingTitle(blocks: Block[], title: string): Block[] {
  const first = blocks[0];
  if (first?.type === "heading" && first.level <= 2 && normalise(inlineText(first.content)) === normalise(title)) return blocks.slice(1);
  return blocks;
}
