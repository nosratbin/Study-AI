import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { OtpInput } from "../otp-input";

// Reanimated 4's own mock needs its Jest resolver in the shared jest config; until that's added, stub just what the
// OTP input uses (the shake). Reduced motion is on, so the shake never runs here.
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
  };
});

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
  const [code, setCode] = useState("");
  return <OtpInput value={code} onChange={setCode} onComplete={onComplete} />;
}

const field = () => screen.getByLabelText("Verification code, 6 digits");
const boxes = () =>
  [1, 2, 3, 4, 5, 6]
    .map((n) => {
      const texts = within(screen.getByTestId(`otp-box-${n}`, { includeHiddenElements: true })).queryAllByText(/\d/, { includeHiddenElements: true });
      return texts.map((t) => t.props.children).join("");
    })
    .join("");

describe("OtpInput", () => {
  it("is one numeric field with the one-time-code autofill", async () => {
    await render(<Harness onComplete={jest.fn()} />);
    expect(field().props.autoComplete).toBe("one-time-code");
    expect(field().props.keyboardType).toBe("number-pad");
  });

  it("spreads a pasted code across the boxes and submits once", async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(field(), "482 913");
    expect(field().props.value).toBe("482913");
    expect(boxes()).toBe("482913");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("482913");
  });

  it("submits when the sixth digit is typed, including Bangla digits", async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    for (const text of ["1", "12", "123", "1234", "12345"]) await fireEvent.changeText(field(), text);
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.changeText(field(), "12345৬");
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("steps back a box when the keyboard deletes a digit", async () => {
    await render(<Harness onComplete={jest.fn()} />);
    await fireEvent.changeText(field(), "12");
    await fireEvent.changeText(field(), "1");
    expect(field().props.value).toBe("1");
    expect(boxes()).toBe("1");
  });
});
