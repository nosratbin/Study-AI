import { buildOpportunityQuery, EMPTY_FILTERS, hasAnyFilter, MAX_QUERY_LENGTH, sheetFilterCount } from "../filters";

describe("buildOpportunityQuery", () => {
  it("is empty with no filters", () => {
    expect(buildOpportunityQuery(EMPTY_FILTERS)).toBe("");
    expect(buildOpportunityQuery({ ...EMPTY_FILTERS, q: "   " })).toBe("");
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false);
  });

  it("builds every parameter in a stable order", () => {
    expect(buildOpportunityQuery({ q: "olympiad", category: "ai_olympiad", level: "college", includeClosed: true })).toBe(
      "?q=olympiad&category=ai_olympiad&level=college&include_closed=true",
    );
    expect(buildOpportunityQuery({ ...EMPTY_FILTERS, level: "school" })).toBe("?level=school");
    expect(buildOpportunityQuery({ ...EMPTY_FILTERS, includeClosed: true })).toBe("?include_closed=true");
  });

  it("trims, collapses spaces and encodes the search", () => {
    expect(buildOpportunityQuery({ ...EMPTY_FILTERS, q: "  ICT   & Math? " })).toBe("?q=ICT%20%26%20Math%3F");
    expect(buildOpportunityQuery({ ...EMPTY_FILTERS, q: "বৃত্তি" })).toBe(`?q=${encodeURIComponent("বৃত্তি")}`);
  });

  it("caps the search at the backend limit", () => {
    const q = "a".repeat(MAX_QUERY_LENGTH + 20);
    expect(buildOpportunityQuery({ ...EMPTY_FILTERS, q })).toBe(`?q=${"a".repeat(MAX_QUERY_LENGTH)}`);
  });
});

describe("sheetFilterCount", () => {
  it("counts only the filters that live in the sheet", () => {
    expect(sheetFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(sheetFilterCount({ level: "university", includeClosed: false })).toBe(1);
    expect(sheetFilterCount({ level: "university", includeClosed: true })).toBe(2);
  });
});
