import { initials, isThemePreference, THEME_OPTIONS, toColorSchemeOverride } from "../settings";

describe("theme preference", () => {
  it("maps System to the auto override and keeps light/dark", () => {
    expect(toColorSchemeOverride("system")).toBe("auto");
    expect(toColorSchemeOverride("light")).toBe("light");
    expect(toColorSchemeOverride("dark")).toBe("dark");
  });

  it("only accepts known stored values", () => {
    expect(THEME_OPTIONS.map((o) => o.value).every(isThemePreference)).toBe(true);
    for (const v of [null, undefined, "", "auto", "Dark", 1]) expect(isThemePreference(v)).toBe(false);
  });
});

describe("initials", () => {
  it("uses the first and last word", () => {
    expect(initials("Nusrat Jahan Rimi")).toBe("NR");
    expect(initials("  rahim  ")).toBe("R");
    expect(initials("ayesha khan")).toBe("AK");
  });

  it("falls back for empty names and keeps Bangla letters", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
    expect(initials("রহিম উদ্দিন")).toBe("রউ");
  });
});
