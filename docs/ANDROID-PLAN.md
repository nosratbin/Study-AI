# Android app plan (Phase 5, not started)

The last open item of Phase 5 is the Expo Android app. Its exit criterion is "Android build runs on test phone". Teacher and admin dashboards and notifications are done.

## Decisions

| | |
|---|---|
| App name | IccheGhuri |
| Package / applicationId | `com.iccheghuri.study.app` (approved 2026-11-14) |
| Icon | kite symbol from `brand/logo/` |
| Backend | live API at `https://iccheghuri.up.railway.app/api` |
| Folder | `mobile/` (Expo, TypeScript, Expo Router, NativeWind) |

## First version

- **Email login** uses the backend's mobile mode. Send `X-Client-Type: mobile` and the tokens come back in the response body. Store them in `expo-secure-store` and refresh on a 401, like `web/src/lib/api.ts` does.
- **Screens:**
  - dashboard
  - courses and lessons
  - AI Tutor
  - Opportunities (verified only)
  - Notifications
  - profile
- **Validation:** mirror `web/src/lib/validation.ts`.

### Deferred: Google sign-in

Google sign-in needs an Android app registered in the Firebase project (`autoanimebot-c8b3d`) first:
- package `com.iccheghuri.study.app`
- SHA-256 from `D:\devtools\ANDROID-NOTES.md`

The user does that step. Then add native Google sign-in and send the Firebase ID token to `/api/auth/google`.

## Build setup

Read `D:\devtools\ANDROID-NOTES.md` before starting. In short:
- **Signing:** the machine's release key, via a gitignored `mobile/android/keystore.properties`, with a fallback to the debug key. Never write the password into a tracked file.
- **Toolchain:** set `JAVA_HOME=D:\devtools\jdk21`, `ANDROID_HOME=D:\devtools\android-sdk` and `GRADLE_USER_HOME=D:\devtools\gradle-home`. Put `sdk.dir` in `android/local.properties`.
- **Build:** `npx expo prebuild`, then a local Gradle `assembleRelease`, then `adb install -r` on the Galaxy A07.

### Already on the machine (checked 2026-11-14)

- SDK platforms 34 and 36
- build-tools 34–36
- NDK 25 (Expo needs 27)
- Gradle 8.3 and 8.14.3

### Still to download

The user must confirm before these start. All of them go on D:; C: has under 10 GB free, so point the npm cache at D:.

| What | Size | Time |
|---|---|---|
| Expo packages | ~400 MB | 10–15 min |
| NDK 27 (+ newer Gradle if required) | ~1.5 GB | 10–20 min |
| Gradle/Maven dependencies, first build | ~1–1.5 GB | 30–60 min |

That is about 1–1.5 hours and ~4 GB in total.

## Before starting

1. Get the user's go-ahead on the downloads above.
2. Make sure the phone is connected (`adb devices`).
3. Open the installed Expo skills: router, project structure, data fetching, Tailwind setup and native UI.

## After Phase 5

Phase 6 covers:
- test hardening
- a security review (set `ENVIRONMENT=production` and a fresh `JWT_SECRET` on Railway)
- a demo script

Deployment is already live (see `DEPLOYMENT.md`).
