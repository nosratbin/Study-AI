/** Mirrors web/src/lib/validation.test.ts, so the mobile and web schemas stay in step with the backend rules. */
import { contactSchema, EMAIL_ALIAS_MESSAGE, isMinor, loginSchema, onboardingSchema, registerSchema, zodErrors } from "../validation";

describe("registerSchema", () => {
  const ok = { full_name: "  Ayesha   Rahman ", email: " Ayesha@Example.com ", password: "secret123", confirm: "secret123" };

  it("normalises name and email", () => {
    const r = registerSchema.parse(ok);
    expect(r.full_name).toBe("Ayesha Rahman");
    expect(r.email).toBe("ayesha@example.com");
  });

  it("enforces password rules like the backend", () => {
    for (const password of ["short1", "lettersonly", "12345678"]) {
      const r = registerSchema.safeParse({ ...ok, password, confirm: password });
      expect(r.success).toBe(false);
    }
    const long = "a1".repeat(40);
    expect(registerSchema.safeParse({ ...ok, password: long, confirm: long }).success).toBe(false);
  });

  it("counts the 72-byte limit in UTF-8 bytes, not characters", () => {
    // 30 Bangla letters are 90 bytes in UTF-8, over bcrypt's 72-byte limit, though only 30 characters long.
    const bangla = "অ".repeat(30) + "1a";
    expect(registerSchema.safeParse({ ...ok, password: bangla, confirm: bangla }).success).toBe(false);
  });

  it("requires matching confirmation", () => {
    const r = registerSchema.safeParse({ ...ok, confirm: "other123" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrors(r.error).confirm).toBe("Passwords don't match");
  });

  it("rejects plus aliases with the backend's message", () => {
    const r = registerSchema.safeParse({ ...ok, email: "ayesha+school@example.com" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrors(r.error).email).toBe(EMAIL_ALIAS_MESSAGE);
    expect(registerSchema.safeParse({ ...ok, email: "a.yesha@example.com" }).success).toBe(true);
  });

  it("requires a name of at least two characters after trimming", () => {
    const r = registerSchema.safeParse({ ...ok, full_name: "  A  " });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrors(r.error).full_name).toBe("Enter your full name");
  });
});

describe("loginSchema", () => {
  it("rejects bad email", () => {
    expect(loginSchema.safeParse({ email: "x", password: "p" }).success).toBe(false);
  });

  it("requires a password", () => {
    const r = loginSchema.safeParse({ email: "a@example.com", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrors(r.error).password).toBe("Enter your password");
  });
});

describe("onboarding", () => {
  const year = 2026;
  const base = { education_level: "college", birth_year: "2000", preferred_language: "en", interests: [], guardian_consent: false };

  it("accepts an adult without guardian consent", () => {
    expect(onboardingSchema(year).safeParse(base).success).toBe(true);
  });

  it("requires guardian consent for minors", () => {
    const minor = { ...base, education_level: "school", birth_year: "2013" };
    const r = onboardingSchema(year).safeParse(minor);
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrors(r.error).guardian_consent).toBeDefined();
    expect(onboardingSchema(year).safeParse({ ...minor, guardian_consent: true }).success).toBe(true);
  });

  it("rejects too-young and missing level", () => {
    expect(onboardingSchema(year).safeParse({ ...base, birth_year: "2022" }).success).toBe(false);
    expect(onboardingSchema(year).safeParse({ ...base, education_level: "" }).success).toBe(false);
  });

  it("treats anyone who may still be 17 as a minor", () => {
    expect(isMinor(2008, 2026)).toBe(true);
    expect(isMinor(2007, 2026)).toBe(false);
  });
});

describe("contactSchema", () => {
  it("validates message length", () => {
    expect(contactSchema.safeParse({ name: "Rina", email: "r@example.com", subject: "Hi", message: "short" }).success).toBe(false);
  });
});
