import type { ApplicationStatus, Opportunity, TrackedApplication } from "@/lib/types";
import { buildTimeline, STATUS_ORDER, statusStep } from "../timeline";

function opp(id: string, title: string, deadline: string | null): Opportunity {
  return {
    id, title, deadline, description: "", category: "hackathon", category_label: "Hackathon", provider: "P", eligibility: "",
    education_levels: [], days_left: null, is_closed: false, required_documents: [], official_url: "https://example.org",
    verified_at: null, saved: true, application: null,
  };
}

function tracked(o: Opportunity, status: ApplicationStatus, updated_at: string, applied_at: string | null = null): TrackedApplication {
  return { opportunity: o, application: { status, notes: null, applied_at, updated_at } };
}

describe("statusStep", () => {
  it("maps statuses onto Planned → Applied → Result", () => {
    expect(STATUS_ORDER.map(statusStep)).toEqual([0, 1, 2, 2]);
  });
});

describe("buildTimeline", () => {
  it("is empty with nothing tracked or saved", () => {
    expect(buildTimeline([], [])).toEqual([]);
  });

  it("groups by stage in pipeline order and skips empty stages", () => {
    const apps = [
      tracked(opp("r", "Rejected one", null), "rejected", "2026-10-01T00:00:00Z", "2026-09-01T00:00:00Z"),
      tracked(opp("p", "Planned one", "2026-12-01T00:00:00Z"), "planned", "2026-11-01T00:00:00Z"),
      tracked(opp("a", "Applied one", null), "applied", "2026-11-02T00:00:00Z", "2026-11-02T00:00:00Z"),
    ];
    const s = buildTimeline(apps);
    expect(s.map((x) => x.key)).toEqual(["planned", "applied", "rejected"]);
    expect(s.map((x) => x.title)).toEqual(["Planning to apply", "Applied", "Not selected"]);
    expect(s[0].data[0]).toMatchObject({ status: "planned", opportunity: { id: "p" } });
  });

  it("orders planned by soonest deadline, undated last", () => {
    const apps = [
      tracked(opp("none", "No deadline", null), "planned", "2026-11-10T00:00:00Z"),
      tracked(opp("late", "Late", "2027-01-10T00:00:00+06:00"), "planned", "2026-11-10T00:00:00Z"),
      tracked(opp("soon", "Soon", "2026-11-20T23:59:00+06:00"), "planned", "2026-11-10T00:00:00Z"),
      // Same instant as "soon" written in UTC: ties fall back to title.
      tracked(opp("soon-b", "Also soon", "2026-11-20T17:59:00Z"), "planned", "2026-11-10T00:00:00Z"),
    ];
    expect(buildTimeline(apps)[0].data.map((i) => i.opportunity.id)).toEqual(["soon-b", "soon", "late", "none"]);
  });

  it("orders applied by most recent application date, falling back to updated_at", () => {
    const apps = [
      tracked(opp("old", "Old", null), "applied", "2026-11-15T00:00:00Z", "2026-10-01T00:00:00Z"),
      tracked(opp("new", "New", null), "applied", "2026-11-01T00:00:00Z", "2026-11-01T00:00:00Z"),
      tracked(opp("nodate", "No applied_at", null), "applied", "2026-10-15T00:00:00Z", null),
    ];
    expect(buildTimeline(apps)[0].data.map((i) => i.opportunity.id)).toEqual(["new", "nodate", "old"]);
  });

  it("appends saved opportunities that aren't tracked, soonest first", () => {
    const tracked1 = opp("t", "Tracked", "2026-11-30T00:00:00Z");
    const saved = [opp("s2", "Later", "2026-12-30T00:00:00Z"), tracked1, opp("s1", "Sooner", "2026-11-25T00:00:00Z")];
    const s = buildTimeline([tracked(tracked1, "planned", "2026-11-01T00:00:00Z")], saved);
    expect(s.map((x) => x.key)).toEqual(["planned", "saved"]);
    expect(s[1].data.map((i) => [i.opportunity.id, i.status])).toEqual([["s1", null], ["s2", null]]);
  });

  it("does not mutate its input", () => {
    const apps = [
      tracked(opp("b", "B", "2026-12-02T00:00:00Z"), "planned", "2026-11-01T00:00:00Z"),
      tracked(opp("a", "A", "2026-12-01T00:00:00Z"), "planned", "2026-11-01T00:00:00Z"),
    ];
    buildTimeline(apps);
    expect(apps.map((t) => t.opportunity.id)).toEqual(["b", "a"]);
  });
});
