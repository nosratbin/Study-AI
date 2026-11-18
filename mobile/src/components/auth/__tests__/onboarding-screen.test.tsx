/**
 * Walks the onboarding stepper end to end against a mocked API: required steps block Continue, optional steps can be
 * skipped, the guardian step appears only for a minor, and finishing posts the payload and reloads the user.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Onboarding from "@/app/(setup)/index";

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  const entering = { duration: () => entering, easing: () => entering, reduceMotion: () => entering, delay: () => entering };
  return {
    __esModule: true,
    default: { View },
    ReduceMotion: { System: "system" },
    Easing: { bezier: () => () => 0 },
    FadeInLeft: entering,
    FadeInRight: entering,
    useReducedMotion: () => true,
    useSharedValue: (v: number) => ({ get: () => v, set: () => undefined }),
    useAnimatedStyle: () => ({}),
    withSequence: () => 0,
    withTiming: () => 0,
    withSpring: () => 0,
    withRepeat: () => 0,
  };
});
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: () => () => undefined }));
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

const mockAuth = {
  user: { full_name: "Ayesha Rahman", role: "student", onboarding_completed: false },
  reload: jest.fn(() => Promise.resolve(true)),
  logout: jest.fn(),
};
jest.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));

const mockApi = jest.fn();
jest.mock("@/lib/api", () => ({ ...jest.requireActual("@/lib/api"), api: (...args: unknown[]) => mockApi(...args) }));

const YEAR = new Date().getUTCFullYear();

// Each test walks the whole stepper; under a loaded CI or dev machine that can pass Jest's 5 s default.
jest.setTimeout(30_000);

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <Onboarding />
    </QueryClientProvider>,
  );
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.mockImplementation((path: string) => {
    if (path === "/meta/districts") return Promise.resolve({ items: [{ name: "Dhaka", bn: "ঢাকা" }, { name: "Sylhet", bn: "সিলেট" }] });
    if (path.startsWith("/meta/institutions")) return Promise.resolve({ items: [] });
    return Promise.resolve({});
  });
});

describe("Onboarding", () => {
  it("walks a minor through every step and submits", async () => {
    await renderScreen();
    expect(screen.getByText("Hi Ayesha, where are you studying now?")).toBeTruthy();
    expect(screen.getByText("Step 1 of 7")).toBeTruthy();

    // Level is required.
    await press("Continue");
    expect(screen.getByText("Choose your level")).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: /^School/ }));
    await press("Continue");

    // Institution and district are optional.
    expect(screen.getByText("Where do you study?")).toBeTruthy();
    await press("Skip this question");
    expect(screen.getByText("Which district do you live in?")).toBeTruthy();
    expect(await screen.findByText("Sylhet")).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: "Sylhet, সিলেট" }));
    await press("Continue");

    // Birth year is required; picking a minor's year adds the guardian step.
    await press("Continue");
    expect(screen.getByText("Choose your birth year")).toBeTruthy();
    await fireEvent.press(screen.getByText(String(YEAR - 13)));
    expect(screen.getByText("Step 4 of 8")).toBeTruthy();
    await press("Continue");

    expect(screen.getByText("Does a parent or guardian know?")).toBeTruthy();
    await press("Continue");
    expect(screen.getByText("A parent or guardian must agree before you continue")).toBeTruthy();
    await fireEvent.press(screen.getByRole("checkbox"));
    await press("Continue");

    await fireEvent.press(screen.getByRole("radio", { name: /বাংলা/ }));
    await press("Continue");
    await fireEvent.press(screen.getByRole("button", { name: "Python" }));
    await press("Continue");
    await fireEvent.changeText(screen.getByLabelText("Your goal"), "Join the AI olympiad");
    await press("Finish setup");

    await waitFor(() => expect(mockAuth.reload).toHaveBeenCalled());
    expect(mockApi).toHaveBeenCalledWith("/students/onboarding", {
      method: "POST",
      body: {
        education_level: "school",
        institution: null,
        class_or_year: null,
        district: "Sylhet",
        birth_year: YEAR - 13,
        preferred_language: "bn",
        interests: ["Python"],
        goals: "Join the AI olympiad",
        guardian_consent: true,
      },
    });
  });

  it("skips the guardian step for an adult and goes back with Back", async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole("radio", { name: /^University/ }));
    await press("Continue");
    await press("Skip this question");
    await press("Skip this question");
    await fireEvent.press(screen.getByText(String(YEAR - 22)));
    await press("Continue");
    expect(screen.getByText("Which language do you prefer?")).toBeTruthy();
    expect(screen.getByText("Step 5 of 7")).toBeTruthy();
    await press("Back");
    expect(screen.getByText("What year were you born?")).toBeTruthy();
  });

  it("returns to the right step when the server rejects a field", async () => {
    const { ApiError } = jest.requireActual("@/lib/api");
    mockApi.mockImplementation((path: string) =>
      path === "/students/onboarding"
        ? Promise.reject(new ApiError(422, "validation_error", "Some fields are invalid.", [{ field: "institution", message: "Too long" }]))
        : Promise.resolve({ items: [] }),
    );
    await renderScreen();
    await fireEvent.press(screen.getByRole("radio", { name: /^College/ }));
    await press("Continue");
    await fireEvent.changeText(screen.getByLabelText("School, college or university"), "Notre Dame College");
    await press("Continue");
    await press("Skip this question");
    await fireEvent.press(screen.getByText(String(YEAR - 25)));
    await press("Continue");
    await press("Continue");
    await press("Skip this question");
    await press("Finish setup");
    expect(await screen.findByText("Too long")).toBeTruthy();
    expect(screen.getByText("Where do you study?")).toBeTruthy();
    expect(mockAuth.reload).not.toHaveBeenCalled();
  });

  it("retries only the reload when the profile saved but the app couldn't continue", async () => {
    mockAuth.reload.mockResolvedValueOnce(false);
    await renderScreen();
    await fireEvent.press(screen.getByRole("radio", { name: /^University/ }));
    await press("Continue");
    await press("Skip this question");
    await press("Skip this question");
    await fireEvent.press(screen.getByText(String(YEAR - 30)));
    await press("Continue");
    await press("Continue");
    await press("Skip this question");
    await press("Finish setup");

    expect(await screen.findByText("Saved. Couldn't continue. Check your connection and tap to retry.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await press("Try again");
    await waitFor(() => expect(mockAuth.reload).toHaveBeenCalledTimes(2));
    expect(mockApi.mock.calls.filter(([path]) => path === "/students/onboarding")).toHaveLength(1);
  });
});
