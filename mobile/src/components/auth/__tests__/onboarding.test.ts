import {
  birthYears,
  errorsForStep,
  filterDistricts,
  firstStepWithError,
  INITIAL_FORM,
  stepsFor,
  suggestedBirthYear,
  toPayload,
  validate,
  type OnboardingForm,
} from "../onboarding";

const YEAR = 2026;
const adult: OnboardingForm = { ...INITIAL_FORM, education_level: "university", birth_year: 2003 };
const minor: OnboardingForm = { ...INITIAL_FORM, education_level: "school", birth_year: 2012 };

describe("stepsFor", () => {
  it("adds the guardian-consent step only for minors, right after the birth year", () => {
    expect(stepsFor(adult, YEAR)).toEqual(["level", "institution", "district", "birth_year", "language", "interests", "goals"]);
    expect(stepsFor(minor, YEAR)).toEqual(["level", "institution", "district", "birth_year", "consent", "language", "interests", "goals"]);
  });

  it("has no consent step before a birth year is chosen", () => {
    expect(stepsFor(INITIAL_FORM, YEAR)).not.toContain("consent");
  });
});

describe("validate", () => {
  it("accepts an adult with only the required answers", () => {
    expect(validate(adult, YEAR)).toEqual({});
  });

  it("asks for level and birth year when missing", () => {
    const e = validate(INITIAL_FORM, YEAR);
    expect(errorsForStep(e, "level").education_level).toBeDefined();
    expect(errorsForStep(e, "birth_year").birth_year).toBe("Choose your birth year");
    expect(errorsForStep(e, "interests")).toEqual({});
  });

  it("requires guardian consent from a minor", () => {
    expect(errorsForStep(validate(minor, YEAR), "consent").guardian_consent).toBeDefined();
    expect(validate({ ...minor, guardian_consent: true }, YEAR)).toEqual({});
  });

  it("rejects students younger than eight", () => {
    expect(validate({ ...adult, birth_year: 2020 }, YEAR).birth_year).toBeDefined();
  });

  it("finds the first step that owns an error", () => {
    const steps = stepsFor(minor, YEAR);
    expect(firstStepWithError({ guardian_consent: "x" }, steps)).toBe(4);
    expect(firstStepWithError({ institution: "too long" }, steps)).toBe(1);
    expect(firstStepWithError({}, steps)).toBe(-1);
  });
});

describe("toPayload", () => {
  it("sends blank optional text as null and keeps typed values", () => {
    expect(toPayload({ ...adult, institution: "  ", district: "Sylhet", goals: "" })).toEqual({
      education_level: "university",
      institution: null,
      class_or_year: null,
      district: "Sylhet",
      birth_year: 2003,
      preferred_language: "en",
      interests: [],
      goals: null,
      guardian_consent: false,
    });
  });
});

describe("birth years", () => {
  it("lists newest first from age 8 down to 1950", () => {
    const years = birthYears(YEAR);
    expect(years[0]).toBe(2018);
    expect(years[years.length - 1]).toBe(1950);
  });

  it("suggests a year by level", () => {
    expect(suggestedBirthYear("school", YEAR)).toBe(2012);
    expect(suggestedBirthYear("university", YEAR)).toBe(2005);
  });
});

describe("filterDistricts", () => {
  const all = [
    { name: "Dhaka", bn: "ঢাকা" },
    { name: "Bogura", bn: "বগুড়া" },
    { name: "Narayanganj", bn: "নারায়ণগঞ্জ" },
    { name: "Gazipur", bn: "গাজীপুর" },
  ];

  it("ranks start-of-name matches before matches inside the name", () => {
    expect(filterDistricts(all, "ga").map((d) => d.name)).toEqual(["Gazipur", "Narayanganj"]);
  });

  it("matches Bangla names", () => {
    expect(filterDistricts(all, "ঢা").map((d) => d.name)).toEqual(["Dhaka"]);
  });

  it("returns everything for an empty query", () => {
    expect(filterDistricts(all, "  ")).toHaveLength(4);
  });
});
