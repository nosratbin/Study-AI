import { describe, expect, it } from "@jest/globals";
import { allDone, daysUntil, deadlineLabel, deadlinesThisWeek, dhakaDate, dhakaHour, formatMinutes, greetingFor } from "../today";

describe("greetingFor", () => {
  it.each([
    [4, "Hello"],
    [5, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [16, "Good afternoon"],
    [17, "Good evening"],
    [21, "Good evening"],
    [22, "Hello"],
    [0, "Hello"],
  ])("hour %i -> %s", (hour, expected) => {
    expect(greetingFor(hour)).toBe(expected);
  });
});

describe("dhakaDate", () => {
  it("uses the Bangladesh calendar day (UTC+6)", () => {
    expect(dhakaDate(new Date("2026-11-17T17:59:00Z"))).toBe("2026-11-17");
    expect(dhakaDate(new Date("2026-11-17T18:00:00Z"))).toBe("2026-11-18");
  });
});

describe("dhakaHour", () => {
  it("is the hour in Bangladesh time (UTC+6)", () => {
    expect(dhakaHour(new Date("2026-11-17T00:30:00Z"))).toBe(6);
    expect(dhakaHour(new Date("2026-11-17T18:00:00Z"))).toBe(0);
    expect(dhakaHour(new Date("2026-11-17T17:59:00Z"))).toBe(23);
  });
});

describe("daysUntil", () => {
  const now = new Date("2026-11-17T20:00:00Z"); // 18 Nov, 02:00 in Dhaka
  it("counts Bangladesh calendar days", () => {
    expect(daysUntil("2026-11-18T17:59:00Z", now)).toBe(0); // 23:59 on 18 Nov in Dhaka
    expect(daysUntil("2026-11-18T18:00:00Z", now)).toBe(1);
    expect(daysUntil("2026-11-17T10:00:00Z", now)).toBe(-1);
  });
});

describe("deadlineLabel", () => {
  it("phrases the countdown", () => {
    expect(deadlineLabel(0)).toBe("Due today");
    expect(deadlineLabel(1)).toBe("Due tomorrow");
    expect(deadlineLabel(5)).toBe("5 days left");
  });
});

describe("deadlinesThisWeek", () => {
  const now = new Date("2026-11-17T06:00:00Z"); // 12:00 in Dhaka
  it("keeps open deadlines within 7 days, soonest first", () => {
    const items = [
      { id: "far", deadline: "2026-11-30T12:00:00Z" },
      { id: "later", deadline: "2026-11-22T12:00:00Z" },
      { id: "past", deadline: "2026-11-17T05:00:00Z" },
      { id: "soon", deadline: "2026-11-17T12:00:00Z" },
      { id: "edge", deadline: "2026-11-23T17:00:00Z" }, // 23:00 on 23 Nov in Dhaka: 6 days
      { id: "out", deadline: "2026-11-24T06:00:00Z" }, // 7 days
    ];
    const out = deadlinesThisWeek(items, now);
    expect(out.map((d) => d.id)).toEqual(["soon", "later", "edge"]);
    expect(out[0].days).toBe(0);
    expect(out[2].days).toBe(6);
  });
});

describe("allDone", () => {
  it("needs at least one task", () => {
    expect(allDone([])).toBe(false);
  });
  it("is true only when every task is done", () => {
    expect(allDone([{ status: "done" }, { status: "todo" }])).toBe(false);
    expect(allDone([{ status: "done" }, { status: "done" }])).toBe(true);
  });
});

describe("formatMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(30)).toBe("30 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(90)).toBe("1 h 30 min");
  });
});
