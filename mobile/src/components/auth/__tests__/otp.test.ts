import { formatWait, isComplete, nextCode, onlyDigits, secondsLeft } from "../otp";

describe("nextCode", () => {
  it("takes typed digits and backspace as plain text edits", () => {
    expect(nextCode("", "4")).toBe("4");
    expect(nextCode("4", "48")).toBe("48");
    expect(nextCode("48", "4")).toBe("4");
    expect(nextCode("4", "")).toBe("");
  });

  it("strips spaces, dashes and letters from a pasted code", () => {
    expect(nextCode("", "482 913")).toBe("482913");
    expect(nextCode("", "482-913")).toBe("482913");
    expect(nextCode("1", "1a")).toBe("1");
  });

  it("accepts Bangla digits", () => {
    expect(onlyDigits("৪৮২৯১৩")).toBe("482913");
    expect(nextCode("", "৪৮২৯১৩")).toBe("482913");
  });

  it("replaces earlier digits with a whole code pasted or autofilled next to them", () => {
    expect(nextCode("12", "12482913")).toBe("482913");
    expect(nextCode("12", "48291312")).toBe("482913");
    expect(nextCode("123456", "123456482913")).toBe("482913");
  });

  it("ignores a digit typed into a full code", () => {
    expect(nextCode("123456", "1234567")).toBe("123456");
    expect(nextCode("123456", "7123456")).toBe("123456");
  });

  it("keeps the first six digits of anything else too long", () => {
    expect(nextCode("", "12345678")).toBe("123456");
  });
});

describe("helpers", () => {
  it("knows when the code is complete", () => {
    expect(isComplete("123456")).toBe(true);
    expect(isComplete("12345")).toBe(false);
    expect(isComplete("")).toBe(false);
  });

  it("counts down whole seconds and formats them", () => {
    expect(secondsLeft(10_500, 10_000)).toBe(1);
    expect(secondsLeft(10_000, 20_000)).toBe(0);
    expect(formatWait(65)).toBe("1:05");
    expect(formatWait(0)).toBe("0:00");
  });
});
