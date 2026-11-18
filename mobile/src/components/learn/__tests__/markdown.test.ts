import { describe, expect, it } from "@jest/globals";
import { inlineText, parseInline, parseMarkdown, safeHref, safeImageSrc, stripLeadingTitle, type Block } from "../markdown";

describe("parseInline", () => {
  it("parses bold, italic and inline code", () => {
    expect(parseInline("A **big** idea, *really*, use `type(x)`.")).toEqual([
      { type: "text", text: "A " },
      { type: "text", text: "big", bold: true },
      { type: "text", text: " idea, " },
      { type: "text", text: "really", italic: true },
      { type: "text", text: ", use " },
      { type: "code", text: "type(x)" },
      { type: "text", text: "." },
    ]);
  });

  it("handles nested italic inside bold", () => {
    expect(parseInline("**one *two* three**")).toEqual([
      { type: "text", text: "one ", bold: true },
      { type: "text", text: "two", bold: true, italic: true },
      { type: "text", text: " three", bold: true },
    ]);
  });

  it("leaves snake_case and lone asterisks alone", () => {
    expect(inlineText(parseInline("set random_state and test_size"))).toBe("set random_state and test_size");
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", text: "2 * 3 = 6" }]);
    expect(parseInline("unclosed **bold")).toEqual([{ type: "text", text: "unclosed **bold" }]);
  });

  it("does not treat delimiters inside code as emphasis", () => {
    expect(parseInline("`a*b*c` and *x*")).toEqual([
      { type: "code", text: "a*b*c" },
      { type: "text", text: " and " },
      { type: "text", text: "x", italic: true },
    ]);
  });

  it("honours backslash escapes", () => {
    expect(parseInline("\\*not italic\\*")).toEqual([{ type: "text", text: "*not italic*" }]);
  });

  it("keeps safe links and neutralises unsafe ones", () => {
    expect(parseInline("[Docs](https://example.com/a)")).toEqual([{ type: "link", href: "https://example.com/a", children: [{ type: "text", text: "Docs" }] }]);
    const [bad] = parseInline("[click](javascript:alert(1))");
    expect(bad).toMatchObject({ type: "link", href: null });
  });
});

describe("safeHref", () => {
  it("allows only http(s) and mailto", () => {
    expect(safeHref("https://x.org")).toBe("https://x.org");
    expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("/learn/x")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
  });
});

describe("parseMarkdown", () => {
  it("parses the seed lesson shape: heading, list, paragraph", () => {
    const md = "# AI around you\n\nYou already use AI every day:\n\n- **Maps** that find the fastest route\n- **Video apps** that suggest\n\n**Big idea:** AI learns patterns.";
    const blocks = parseMarkdown(md);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "paragraph"]);
    const list = blocks[2] as Extract<Block, { type: "list" }>;
    expect(list.items).toHaveLength(2);
    expect(list.items[0]).toMatchObject({ depth: 0, ordered: false });
    expect(list.items[0].content[0]).toEqual({ type: "text", text: "Maps", bold: true });
  });

  it("numbers ordered lists from their start value", () => {
    const blocks = parseMarkdown("3. three\n4. four\n5. five");
    const list = blocks[0] as Extract<Block, { type: "list" }>;
    expect(list.items.map((i) => i.number)).toEqual([3, 4, 5]);
    expect(list.items.every((i) => i.ordered)).toBe(true);
  });

  it("nests list items by indent and continues across blank lines", () => {
    const blocks = parseMarkdown("- a\n  - a1\n\n- b\ncontinues here?\n\nAfter");
    const list = blocks[0] as Extract<Block, { type: "list" }>;
    expect(list.items.map((i) => [inlineText(i.content), i.depth])).toEqual([
      ["a", 0],
      ["a1", 1],
      ["b", 0],
    ]);
    expect(blocks.slice(1).map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("keeps fenced code verbatim, with its language", () => {
    const md = 'Intro\n\n```python\nfor i in range(10):\n    print("clap **not bold**")\n```\n\nAfter';
    const blocks = parseMarkdown(md);
    expect(blocks[1]).toEqual({ type: "code", lang: "python", text: 'for i in range(10):\n    print("clap **not bold**")' });
    expect(blocks[2]).toMatchObject({ type: "paragraph" });
  });

  it("closes an unterminated code fence at the end of the input", () => {
    expect(parseMarkdown("```\ncode")).toEqual([{ type: "code", lang: null, text: "code" }]);
  });

  it("parses pipe tables", () => {
    const md = "| Feature | Example |\n|---|---|\n| Area (sq ft) | 1200 |\n| Location | Dhanmondi |";
    const [table] = parseMarkdown(md);
    expect(table.type).toBe("table");
    const t = table as Extract<Block, { type: "table" }>;
    expect(t.header.map(inlineText)).toEqual(["Feature", "Example"]);
    expect(t.rows.map((r) => r.map(inlineText))).toEqual([
      ["Area (sq ft)", "1200"],
      ["Location", "Dhanmondi"],
    ]);
  });

  it("parses blockquotes and horizontal rules", () => {
    const blocks = parseMarkdown("> **Note:** check it\n\n---\n\nEnd");
    expect(blocks[0]).toMatchObject({ type: "quote" });
    expect((blocks[0] as Extract<Block, { type: "quote" }>).blocks[0]).toMatchObject({ type: "paragraph" });
    expect(blocks[1]).toEqual({ type: "hr" });
  });

  it("joins soft-wrapped paragraph lines with a space", () => {
    const [p] = parseMarkdown("one\ntwo");
    expect(inlineText((p as Extract<Block, { type: "paragraph" }>).content)).toBe("one two");
  });

  it("renders raw HTML as text, never markup", () => {
    const [p] = parseMarkdown("<script>alert(1)</script>");
    expect(p).toEqual({ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] });
  });

  it("handles Windows line endings and empty input", () => {
    expect(parseMarkdown("# T\r\n\r\nBody").map((b) => b.type)).toEqual(["heading", "paragraph"]);
    expect(parseMarkdown("")).toEqual([]);
  });
});

describe("headings", () => {
  it("keeps a literal # at the end of a heading", () => {
    const [h] = parseMarkdown("## Learning C#");
    expect(h).toMatchObject({ type: "heading", level: 2 });
    expect(inlineText((h as Extract<Block, { type: "heading" }>).content)).toBe("Learning C#");
  });

  it("strips closing hashes that follow whitespace", () => {
    const [h] = parseMarkdown("### Title ###");
    expect(inlineText((h as Extract<Block, { type: "heading" }>).content)).toBe("Title");
    const [h2] = parseMarkdown("# F# and C# #");
    expect(inlineText((h2 as Extract<Block, { type: "heading" }>).content)).toBe("F# and C#");
  });
});

describe("images", () => {
  it("turns a standalone https image into an image block", () => {
    expect(parseMarkdown("![A neural network](https://example.com/nn.png)")).toEqual([{ type: "image", alt: "A neural network", src: "https://example.com/nn.png" }]);
  });

  it("drops unsafe image sources but keeps the alt text", () => {
    expect(parseMarkdown("![diagram](http://example.com/a.png)")).toEqual([{ type: "image", alt: "diagram", src: null }]);
    expect(parseMarkdown("![x](javascript:void)")[0]).toMatchObject({ type: "image", src: null });
    expect(inlineText(parseInline("![x](javascript:alert(1))"))).toBe("x)");
    expect(safeImageSrc("https://x.org/a.png")).toBe("https://x.org/a.png");
    expect(safeImageSrc("data:image/png;base64,AAA")).toBeNull();
  });

  it("keeps an image inside running text as an inline node, never a stray '!'", () => {
    const [p] = parseMarkdown("See ![the chart](https://x.org/c.png) below.");
    expect(p.type).toBe("paragraph");
    const content = (p as Extract<Block, { type: "paragraph" }>).content;
    expect(content).toContainEqual({ type: "image", alt: "the chart", src: "https://x.org/c.png" });
    expect(inlineText(content)).toBe("See the chart below.");
  });

  it("leaves a plain exclamation mark alone", () => {
    expect(inlineText(parseInline("Wow! [link](https://x.org)"))).toBe("Wow! link");
  });
});

describe("stripLeadingTitle", () => {
  it("drops a first heading that repeats the lesson title", () => {
    const blocks = parseMarkdown("# AI around you\n\nBody");
    expect(stripLeadingTitle(blocks, "AI around you").map((b) => b.type)).toEqual(["paragraph"]);
    expect(stripLeadingTitle(blocks, "ai around you!").map((b) => b.type)).toEqual(["paragraph"]);
  });

  it("keeps a different first heading", () => {
    const blocks = parseMarkdown("# Something else\n\nBody");
    expect(stripLeadingTitle(blocks, "AI around you")).toBe(blocks);
  });
});
