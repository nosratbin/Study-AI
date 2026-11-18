import { DAY_MS, deadlineCountdown, HOUR_MS, URGENT_DAYS } from "../deadline";

const NOW = Date.parse("2026-11-17T06:00:00Z"); // 12:00 noon in Dhaka

describe("deadlineCountdown", () => {
  it("handles a missing or unparsable deadline", () => {
    for (const d of [null, undefined, "", "not a date"]) {
      expect(deadlineCountdown(d, NOW)).toMatchObject({ state: "none", urgent: false, days: null, short: "No fixed deadline" });
    }
  });

  it("is closed at and after the deadline", () => {
    expect(deadlineCountdown("2026-11-17T06:00:00Z", NOW)).toMatchObject({ state: "closed", urgent: false, short: "Closed", spoken: "Applications closed" });
    expect(deadlineCountdown("2026-11-01T00:00:00Z", NOW).state).toBe("closed");
  });

  it("counts whole 24-hour periods, rounding down like the backend", () => {
    expect(deadlineCountdown(new Date(NOW + 5 * DAY_MS + 23 * HOUR_MS).toISOString(), NOW)).toMatchObject({
      days: 5,
      short: "5 days left",
      spoken: "Closes in 5 days",
    });
    expect(deadlineCountdown(new Date(NOW + DAY_MS).toISOString(), NOW)).toMatchObject({ days: 1, short: "1 day left", spoken: "Closes in 1 day" });
  });

  it("switches to hours inside the last day", () => {
    expect(deadlineCountdown(new Date(NOW + 3 * HOUR_MS + 59 * 60_000).toISOString(), NOW)).toMatchObject({
      days: 0,
      short: "3h left",
      spoken: "Closes in 3 hours",
      urgent: true,
    });
    expect(deadlineCountdown(new Date(NOW + HOUR_MS).toISOString(), NOW).spoken).toBe("Closes in 1 hour");
    expect(deadlineCountdown(new Date(NOW + 10 * 60_000).toISOString(), NOW)).toMatchObject({ short: "Under 1h left", spoken: "Closes in less than an hour" });
  });

  it("turns urgent strictly inside 7 days", () => {
    expect(URGENT_DAYS).toBe(7);
    const at = (ms: number) => deadlineCountdown(new Date(NOW + ms).toISOString(), NOW);
    expect(at(7 * DAY_MS).urgent).toBe(false);
    expect(at(7 * DAY_MS + 1).urgent).toBe(false);
    expect(at(7 * DAY_MS - 1)).toMatchObject({ urgent: true, days: 6 });
    expect(at(30 * DAY_MS).urgent).toBe(false);
  });

  it("gives the same answer whatever offset the deadline is written in", () => {
    // 23:59 on 20 Nov in Dhaka is 17:59 UTC; the countdown depends on the instant, not on the device timezone.
    const dhaka = deadlineCountdown("2026-11-20T23:59:00+06:00", NOW);
    const utc = deadlineCountdown("2026-11-20T17:59:00Z", NOW);
    const ny = deadlineCountdown("2026-11-20T12:59:00-05:00", NOW);
    expect(dhaka).toEqual(utc);
    expect(ny).toEqual(utc);
    expect(utc).toMatchObject({ days: 3, urgent: true, short: "3 days left" });
  });

  it("defaults `now` to the current time", () => {
    expect(deadlineCountdown(new Date(Date.now() + 10 * DAY_MS + HOUR_MS).toISOString()).days).toBe(10);
  });
});
