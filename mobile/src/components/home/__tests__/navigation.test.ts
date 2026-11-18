import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { router } from "expo-router";
import { go, isTabRoute, NAV_LOCK_MS, resetNavLock } from "../navigation";

// Hoisted above the imports by babel-jest.
jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

const push = router.push as jest.Mock;
const navigate = router.navigate as jest.Mock;

beforeEach(() => {
  push.mockClear();
  navigate.mockClear();
  resetNavLock();
});

describe("isTabRoute", () => {
  it.each(["/", "/learn", "/tutor", "/opportunities", "/profile"])("%s is a tab", (r) => expect(isTabRoute(r)).toBe(true));
  it.each(["/notifications", "/course/x", "/lesson/1", "/opportunity/2"])("%s is not a tab", (r) => expect(isTabRoute(r)).toBe(false));
});

describe("go", () => {
  it("navigates to tabs and pushes detail screens", () => {
    go("/learn", 1000);
    go("/course/intro", 1000 + NAV_LOCK_MS);
    expect(navigate).toHaveBeenCalledWith("/learn");
    expect(push).toHaveBeenCalledWith("/course/intro");
  });

  it("drops a second tap inside the lock window", () => {
    expect(go("/notifications", 1000)).toBe(true);
    expect(go("/notifications", 1000 + NAV_LOCK_MS - 1)).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
    expect(go("/notifications", 1000 + NAV_LOCK_MS)).toBe(true);
    expect(push).toHaveBeenCalledTimes(2);
  });
});
