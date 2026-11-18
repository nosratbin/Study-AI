import { describe, expect, it } from "@jest/globals";
import type { AppNotification } from "@/lib/types";
import { groupByDay, routeForLink } from "../group";

function n(id: string, created_at: string): AppNotification {
  return { id, title: id, body: "", kind: "info", link: null, read_at: null, created_at };
}

describe("groupByDay", () => {
  const now = new Date("2026-11-17T20:00:00Z"); // 18 Nov, 02:00 in Dhaka

  it("groups by Bangladesh calendar day and keeps order", () => {
    const items = [
      n("a", "2026-11-17T19:00:00Z"), // 18 Nov 01:00 Dhaka: today
      n("b", "2026-11-17T18:00:00Z"), // 18 Nov 00:00 Dhaka: today
      n("c", "2026-11-17T17:59:00Z"), // 17 Nov 23:59 Dhaka: yesterday
      n("d", "2026-11-16T18:00:00Z"), // 17 Nov 00:00 Dhaka: yesterday
      n("e", "2026-11-16T17:00:00Z"), // 16 Nov: earlier
    ];
    expect(groupByDay(items, now)).toEqual([
      { title: "Today", data: [items[0], items[1]] },
      { title: "Yesterday", data: [items[2], items[3]] },
      { title: "Earlier", data: [items[4]] },
    ]);
  });

  it("omits empty sections", () => {
    const items = [n("x", "2026-11-01T10:00:00Z")];
    expect(groupByDay(items, now)).toEqual([{ title: "Earlier", data: items }]);
    expect(groupByDay([], now)).toEqual([]);
  });

  it("treats a clock-skewed future timestamp as today", () => {
    const items = [n("f", "2026-11-19T10:00:00Z")];
    expect(groupByDay(items, now)[0].title).toBe("Today");
  });
});

describe("routeForLink", () => {
  it.each([
    ["/opportunities-hub/7f3c-uuid", "/opportunity/7f3c-uuid"],
    ["/opportunities-hub", "/opportunities"],
    ["/learn/intro-to-ai", "/course/intro-to-ai"],
    ["/learn", "/learn"],
    ["/lessons/abc-123", "/lesson/abc-123"],
    ["/tutor", "/tutor"],
    ["/dashboard", "/"],
    ["/settings", "/profile"],
    ["/learn/intro-to-ai?tab=1#x", "/course/intro-to-ai"],
    ["/learn/", "/learn"],
  ])("%s -> %s", (link, route) => {
    expect(routeForLink(link)).toBe(route);
  });

  it.each([null, undefined, "", "https://example.com/x", "//evil.com/x", "/passport", "/projects/123", "/lessons", "/learn/a/b", "/learn/..", "/learn/a%20b"])(
    "%s has no in-app route",
    (link) => {
      expect(routeForLink(link)).toBeNull();
    },
  );
});
