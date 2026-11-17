"use client";
// From beui.dev/components/blocks/signup-form: its password field with the show/hide toggle, as its own component so
// the sign-in and sign-up forms share it.

import { Eye, EyeOff, Lock } from "lucide-react";
import { forwardRef, useState } from "react";
import { Input, type InputProps } from "./input";

export type PasswordInputProps = Omit<InputProps, "type" | "leftIcon" | "rightIcon" | "success">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(props, ref) {
  const [reveal, setReveal] = useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={reveal ? "text" : "password"}
      leftIcon={<Lock />}
      rightIcon={
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => setReveal((r) => !r)}
          aria-label="Show password"
          aria-pressed={reveal}
          className="text-muted outline-none transition-colors hover:text-ink focus-visible:text-ink"
        >
          {reveal ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  );
});
