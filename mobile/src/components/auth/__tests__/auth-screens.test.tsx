/**
 * Behaviour of the login, register and verify-email screens against a mocked useAuth: client validation, server error
 * mapping, the email_unverified hand-off, and auto-submitting the code.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ApiError } from "@/lib/api";
import Login from "@/app/(auth)/login";
import Register from "@/app/(auth)/register";
import VerifyEmail from "@/app/(auth)/verify-email";

// Reanimated 4's own mock needs its Jest resolver in the shared jest config; stub what these screens touch.
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: { View },
    ReduceMotion: { System: "system" },
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
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 56 }));

const mockAuth = {
  pending: null as { email: string; resendAt: number } | null,
  setPending: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  verifyEmail: jest.fn(),
  resendCode: jest.fn(),
};
jest.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));

const { router } = jest.requireMock("expo-router") as { router: { push: jest.Mock; replace: jest.Mock } };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.pending = null;
});

const press = (label: string) => fireEvent.press(screen.getByRole("button", { name: label }));

describe("Login", () => {
  it("validates before calling the API", async () => {
    await render(<Login />);
    await press("Sign in");
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    expect(screen.getByText("Enter your password")).toBeTruthy();
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it("continues to verify-email when the account is unverified", async () => {
    mockAuth.login.mockRejectedValue(new ApiError(403, "email_unverified", "Verify your email", [{ email: "a@example.com", resend_after: 60 }]));
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Email"), " a@example.com ");
    await fireEvent.changeText(screen.getByLabelText("Password"), "secret123");
    await press("Sign in");
    expect(mockAuth.login).toHaveBeenCalledWith("a@example.com", "secret123");
    expect(router.push).toHaveBeenCalledWith("/verify-email");
  });

  it("shows wrong-password and offline errors as a form message", async () => {
    mockAuth.login.mockRejectedValueOnce(new ApiError(401, "invalid_credentials", "Email or password is incorrect."));
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "a@example.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    await press("Sign in");
    expect(screen.getByText("Email or password is incorrect.")).toBeTruthy();

    mockAuth.login.mockRejectedValueOnce(new ApiError(0, "network_error", "offline"));
    await press("Sign in");
    expect(screen.getByText(/You're offline/)).toBeTruthy();
  });
});

describe("Register", () => {
  async function fill(email: string) {
    await fireEvent.changeText(screen.getByLabelText("Full name"), "Ayesha Rahman");
    await fireEvent.changeText(screen.getByLabelText("Email"), email);
    await fireEvent.changeText(screen.getByLabelText("Password"), "secret123");
    await fireEvent.changeText(screen.getByLabelText("Confirm password"), "secret123");
  }

  it("rejects plus-aliases without calling the API", async () => {
    await render(<Register />);
    await fill("ayesha+x@example.com");
    await press("Create account");
    expect(screen.getByText(/aliases with \+ aren't allowed/)).toBeTruthy();
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it("registers with normalised values and continues to verify-email", async () => {
    mockAuth.register.mockResolvedValue({ email: "ayesha@example.com", resendAt: Date.now() + 60_000 });
    await render(<Register />);
    await fill(" Ayesha@Example.com ");
    await press("Create account");
    expect(mockAuth.register).toHaveBeenCalledWith("Ayesha Rahman", "ayesha@example.com", "secret123");
    expect(router.push).toHaveBeenCalledWith("/verify-email");
  });

  it("puts server field errors under the field", async () => {
    mockAuth.register.mockRejectedValue(new ApiError(409, "email_taken", "An account with this email already exists. Try signing in."));
    await render(<Register />);
    await fill("ayesha@example.com");
    await press("Create account");
    expect(screen.getByText("An account with this email already exists. Try signing in.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in instead" })).toBeTruthy();
  });
});

describe("VerifyEmail", () => {
  it("shows the email and submits a pasted code without a tap", async () => {
    mockAuth.pending = { email: "ayesha@example.com", resendAt: Date.now() + 60_000 };
    mockAuth.verifyEmail.mockResolvedValue({});
    await render(<VerifyEmail />);
    expect(screen.getByText("ayesha@example.com")).toBeTruthy();
    expect(screen.getByText(/Send a new code in 1:00|Send a new code in 0:5\d/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Verification code, 6 digits"), "482913");
    expect(mockAuth.verifyEmail).toHaveBeenCalledWith("ayesha@example.com", "482913");
  });

  it("clears the boxes and explains a wrong code", async () => {
    jest.useFakeTimers();
    mockAuth.pending = { email: "ayesha@example.com", resendAt: 0 };
    mockAuth.verifyEmail.mockRejectedValue(new ApiError(400, "invalid_code", "That code is wrong. Check the email and try again."));
    await render(<VerifyEmail />);
    await fireEvent.changeText(screen.getByLabelText("Verification code, 6 digits"), "111111");
    await act(async () => jest.runOnlyPendingTimers());
    expect(screen.getByText("That code is wrong. Check the email and try again.")).toBeTruthy();
    expect(screen.getByLabelText("Verification code, 6 digits").props.value).toBe("");
    jest.useRealTimers();
  });

  it("offers a new code once the countdown ends", async () => {
    mockAuth.pending = { email: "ayesha@example.com", resendAt: 0 };
    mockAuth.resendCode.mockResolvedValue({ email: "ayesha@example.com", resendAt: Date.now() + 60_000 });
    await render(<VerifyEmail />);
    await press("Send a new code");
    expect(mockAuth.resendCode).toHaveBeenCalledWith("ayesha@example.com");
    expect(screen.getByText(/a new code is on its way/)).toBeTruthy();
  });

  it("asks for the email when there's no pending verification", async () => {
    mockAuth.resendCode.mockResolvedValue({ email: "ayesha@example.com", resendAt: Date.now() + 60_000 });
    await render(<VerifyEmail />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "Ayesha@Example.com");
    await press("Send code");
    expect(mockAuth.resendCode).toHaveBeenCalledWith("ayesha@example.com");
  });
});
