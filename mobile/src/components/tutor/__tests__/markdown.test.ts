/// <reference types="jest" />
import { httpsHost, linkDisplay, parseInline, parseMarkdown, plainText } from "../markdown";

describe("parseInline", () => {
  it("handles bold, italic, code and https links", () => {
    expect(parseInline("A **bold** and *soft* `x = 1` [docs](https://example.com/a)")).toEqual([
      { type: "text", text: "A " },
      { type: "text", text: "bold", bold: true },
      { type: "text", text: " and " },
      { type: "text", text: "soft", italic: true },
      { type: "text", text: " " },
      { type: "code", text: "x = 1" },
      { type: "text", text: " " },
      { type: "link", text: "docs", url: "https://example.com/a", host: "example.com" },
    ]);
  });

  it("nests emphasis without leaving stray asterisks", () => {
    expect(parseInline("**a *b* c**")).toEqual([
      { type: "text", text: "a ", bold: true },
      { type: "text", text: "b", bold: true, italic: true },
      { type: "text", text: " c", bold: true },
    ]);
    expect(parseInline("*see **this** now*")).toEqual([
      { type: "text", text: "see ", italic: true },
      { type: "text", text: "this", bold: true, italic: true },
      { type: "text", text: " now", italic: true },
    ]);
  });

  it("needs word boundaries for * and _ emphasis", () => {
    expect(parseInline("x*y*z")).toEqual([{ type: "text", text: "x*y*z" }]);
    expect(parseInline("a**b**c")).toEqual([{ type: "text", text: "a**b**c" }]);
    expect(parseInline("2 * 3 * 4")).toEqual([{ type: "text", text: "2 * 3 * 4" }]);
    expect(parseInline("snake_case_name")).toEqual([{ type: "text", text: "snake_case_name" }]);
    expect(parseInline("**open")).toEqual([{ type: "text", text: "**open" }]);
    expect(parseInline("an _idea_.")).toEqual([
      { type: "text", text: "an " },
      { type: "text", text: "idea", italic: true },
      { type: "text", text: "." },
    ]);
  });

  it("only makes https links tappable", () => {
    expect(parseInline("[x](javascript:alert(1))").some((n) => n.type === "link")).toBe(false);
    expect(parseInline("[plain](http://example.com)")).toEqual([{ type: "text", text: "plain" }]);
  });

  it("keeps Bangla text intact", () => {
    expect(parseInline("**লুপ** হলো পুনরাবৃত্তি")).toEqual([
      { type: "text", text: "লুপ", bold: true },
      { type: "text", text: " হলো পুনরাবৃত্তি" },
    ]);
  });
});

describe("links show where they go", () => {
  it("httpsHost drops userinfo and rejects non-https", () => {
    expect(httpsHost("https://Evil.Example/path?q=1")).toBe("evil.example");
    expect(httpsHost("https://lesson.iccheghuri@evil.example/x")).toBe("evil.example");
    expect(httpsHost("http://example.com")).toBeNull();
    expect(httpsHost("mailto:a@b.c")).toBeNull();
  });

  it("adds the host to a descriptive label, once", () => {
    const [link] = parseInline("[Open your lesson](https://evil.example)");
    expect(link).toMatchObject({ type: "link", host: "evil.example" });
    expect(linkDisplay("Open your lesson", "https://evil.example", "evil.example")).toEqual({ label: "Open your lesson", host: "evil.example" });
    expect(linkDisplay("https://docs.python.org/3/", "https://docs.python.org/3/", "docs.python.org")).toEqual({ label: "https://docs.python.org/3/", host: null });
    expect(linkDisplay("docs.python.org", "https://docs.python.org/3/", "docs.python.org")).toEqual({ label: "docs.python.org", host: null });
  });
});

describe("parseMarkdown", () => {
  it("splits headings, paragraphs, lists and code fences", () => {
    const src = ["## Loops", "", "A loop repeats.", "Like this:", "", "- one", "- **two**", "", "1. first", "2. second", "", "```python", "for i in range(3):", "    print(i)", "```"].join("\n");
    const blocks = parseMarkdown(src);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "list", "code"]);
    expect(blocks[1]).toEqual({ type: "paragraph", inlines: [{ type: "text", text: "A loop repeats.\nLike this:" }] });
    expect(blocks[2]).toMatchObject({ ordered: false, items: [[{ type: "text", text: "one" }], [{ type: "text", text: "two", bold: true }]] });
    expect(blocks[3]).toMatchObject({ ordered: true, start: 1 });
    expect(blocks[4]).toEqual({ type: "code", text: "for i in range(3):\n    print(i)" });
  });

  it("keeps a real # at the end of a heading and strips only spaced closing hashes", () => {
    expect(parseMarkdown("## Learning C#")).toEqual([{ type: "heading", inlines: [{ type: "text", text: "Learning C#" }] }]);
    expect(parseMarkdown("### Title ###")).toEqual([{ type: "heading", inlines: [{ type: "text", text: "Title" }] }]);
  });

  it("keeps an unclosed code fence as code to the end", () => {
    expect(parseMarkdown("```\nx = 1")).toEqual([{ type: "code", text: "x = 1" }]);
  });

  it("joins an indented continuation line onto the list item", () => {
    const [list] = parseMarkdown("- first **item\n  continues** here");
    expect(list).toEqual({
      type: "list",
      ordered: false,
      start: 1,
      items: [
        [
          { type: "text", text: "first " },
          { type: "text", text: "item continues", bold: true },
          { type: "text", text: " here" },
        ],
      ],
    });
  });

  it("plainText strips markup for announcements", () => {
    expect(plainText("**Hi** there\n\n- `a`\n- b")).toBe("Hi there\na\nb");
  });
});
