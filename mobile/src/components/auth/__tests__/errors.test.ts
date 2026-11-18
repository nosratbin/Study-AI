import { ApiError } from "@/lib/api";
import { splitApiError } from "../errors";

describe("splitApiError", () => {
  it("maps validation details onto the form's own fields", () => {
    const e = new ApiError(422, "validation_error", "Some fields are invalid.", [
      { field: "email", message: "Value error, Email aliases with + aren't allowed. Use your main email address" },
      { field: "password", message: "Password must contain at least one letter and one number" },
    ]);
    expect(splitApiError(e, ["email", "password"])).toEqual({
      fields: {
        email: "Email aliases with + aren't allowed. Use your main email address",
        password: "Password must contain at least one letter and one number",
      },
      message: null,
    });
  });

  it("shows details for fields the form doesn't have as the form message", () => {
    const e = new ApiError(422, "validation_error", "Some fields are invalid.", [
      { field: "email", message: "Bad email" },
      { field: "captcha", message: "Try again" },
    ]);
    expect(splitApiError(e, ["email"])).toEqual({ fields: { email: "Bad email" }, message: "Try again" });
  });

  it("uses the backend message for other errors", () => {
    const e = new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
    expect(splitApiError(e, ["email", "password"])).toEqual({ fields: {}, message: "Email or password is incorrect." });
  });

  it("explains offline and rate-limited errors", () => {
    expect(splitApiError(new ApiError(0, "network_error", "x"), []).message).toMatch(/offline/);
    expect(splitApiError(new ApiError(429, "rate_limited", "x"), []).message).toMatch(/Wait a minute/);
  });

  it("keeps the email_not_configured explanation", () => {
    const e = new ApiError(503, "email_not_configured", "Email sign-up is unavailable right now.");
    expect(splitApiError(e, []).message).toBe("Email sign-up is unavailable right now.");
  });

  it("falls back for unexpected throws", () => {
    expect(splitApiError(new Error("boom"), [], "Could not sign in.").message).toBe("Could not sign in.");
  });
});
