/**
 * Pins down how Expo Router resolves the root Stack.Protected guards (src/app/_layout.tsx) for the auth and setup groups.
 *
 * A guard redirect goes to the first unguarded group's URL ("/(auth)", "/(setup)"), which only matches a route when
 * the group has an `index`. So Welcome is `(auth)/index` and onboarding is `(setup)/index`: they share "/" with
 * `(app)/(tabs)/index`, and the guards decide which one is reachable.
 */
import { useSyncExternalStore } from "react";
import { Text } from "react-native";
import { Stack } from "expo-router";
import { act, renderRouter, screen, testRouter } from "expo-router/testing-library";

type Session = "signed-out" | "needs-onboarding" | "ready";

let session: Session = "signed-out";
const listeners = new Set<() => void>();
function setSession(next: Session) {
  session = next;
  listeners.forEach((l) => l());
}
function useSession() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

function stub(label: string) {
  const C = () => <Text>{label}</Text>;
  C.displayName = label;
  return C;
}

function RootLayout() {
  const s = useSession();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={s === "signed-out"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={s === "needs-onboarding"}>
        <Stack.Screen name="(setup)" />
      </Stack.Protected>
      <Stack.Protected guard={s === "ready"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

const group = () => <Stack screenOptions={{ headerShown: false }} />;

const routes = {
  _layout: RootLayout,
  "(auth)/_layout": { unstable_settings: { anchor: "index" }, default: group },
  "(auth)/index": stub("welcome-screen"),
  "(auth)/login": stub("login-screen"),
  "(auth)/register": stub("register-screen"),
  "(auth)/verify-email": stub("verify-screen"),
  "(setup)/_layout": group,
  "(setup)/index": stub("onboarding-screen"),
  "(app)/_layout": group,
  "(app)/(tabs)/_layout": group,
  "(app)/(tabs)/index": stub("home-screen"),
};

describe("root guards", () => {
  it("sends a signed-out user opening / to Welcome", async () => {
    setSession("signed-out");
    const r = await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("welcome-screen")).toBeTruthy();
    expect(r.getSegments()).toEqual(["(auth)"]);
  });

  it("opens Home at / for a signed-in, onboarded user", async () => {
    setSession("ready");
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("home-screen")).toBeTruthy();
  });

  it("opens onboarding at / for a student who hasn't onboarded", async () => {
    setSession("needs-onboarding");
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("onboarding-screen")).toBeTruthy();
  });

  it("moves through verify -> onboarding -> home as the session changes, and back to Welcome on sign-out", async () => {
    setSession("signed-out");
    await renderRouter(routes, { initialUrl: "/verify-email" });
    expect(await screen.findByText("verify-screen")).toBeTruthy();

    await act(async () => setSession("needs-onboarding"));
    expect(await screen.findByText("onboarding-screen")).toBeTruthy();

    await act(async () => setSession("ready"));
    expect(await screen.findByText("home-screen")).toBeTruthy();

    await act(async () => setSession("signed-out"));
    expect(await screen.findByText("welcome-screen")).toBeTruthy();
  });

  it("keeps a deep link to /login on the login screen, with Welcome underneath for back", async () => {
    setSession("signed-out");
    await renderRouter(routes, { initialUrl: "/login" });
    expect(await screen.findByText("login-screen")).toBeTruthy();
    await act(async () => testRouter.back());
    expect(await screen.findByText("welcome-screen")).toBeTruthy();
  });
});
