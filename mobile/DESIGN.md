# IccheGhuri mobile: design direction

This is a native Android app, not the web app shrunk down. The **brand** is shared with the web: orange `#F97316`, the kite, the token colours in `src/global.css`, and light and dark themes. The **layouts, navigation and interactions are mobile-first** and designed per screen.

The user is a Bangladeshi student, often on a budget Android phone with patchy data. They open the app for a few minutes at a time: on the bus, between classes, before sleep. Design for one-handed use and short sessions.

## Rules for every screen

- **One job per screen.** Each screen has one primary action. Put it in the thumb zone, either as a sticky bottom bar or a full-width button at the bottom. Don't put it in a header corner.
- **Don't port web patterns.** No stat-tile grids, no sidebars, no wide tables, no hover states and no "card with a border around everything". Group content with spacing and soft surfaces (`bg-card` on `bg-surface`, `rounded-3xl`), not outlines.
- **Native navigation.**
  - Use a stack push for drill-down screens.
  - Use bottom sheets for filters, options and quick actions.
  - Use a modal only for focused tasks such as practice quizzes.
  - The Android back button must always do the expected thing.
  - Use `expo-web-browser` for external links (application URLs, sources).
- **Lists:**
  - Use `FlatList` / `SectionList`, never a `.map()` inside a ScrollView for unbounded data.
  - Add pull-to-refresh on every list.
  - Show skeleton placeholders while loading. Use a spinner only for button actions.
- **Gestures:**
  - Horizontal rails for browsing.
  - Swipe-to-mark-read on notifications.
  - Lessons support swiping between screens.
  - Never make a gesture the *only* way to do something.
- **Feedback:**
  - Press: scale 0.97 with a spring, plus `Haptics.selectionAsync`.
  - Success: `Haptics.notificationAsync(Success)`.
  - Optimistic updates for toggles (task done, notification read, bookmark).
- **Peak moments** get celebrated, briefly: a lesson completed, a course completed, a certificate earned or a streak kept. Use a short spring, the kite, a haptic and one line of encouraging copy. Don't use confetti on everything.
- **Offline:**
  - Show a slim banner when the network is down.
  - Keep showing cached query data instead of an error screen.
  - Errors say what happened and offer a retry.
- **Typography:**
  - Use the system font (Roboto on Android, which handles Bangla through Noto).
  - Use at most 4 sizes per screen: 28/34 large title, 17/24 title, 15/22 body, 13/18 caption.
  - Use 2 weights (400 and 600; 700 only for large titles).
  - Bangla text needs a generous line height. Never fix the height of a text container. Support font scaling.
- **Colour, 60/30/10:**
  - Neutral surfaces carry the screen.
  - Ink is for text.
  - Orange is only for the primary action, the active state, progress and the streak.
  - Red only for errors and destructive actions.
- **Touch targets** are at least 48 dp. Give every icon-only button an `accessibilityLabel`.
- **Performance on low-end phones:**
  - No blur.
  - No large shadows on list items.
  - Use `expo-image` with caching.
  - Run animations on the UI thread (Reanimated), and respect reduce-motion.

## Screens

### Auth (signed out)
- **Welcome:** the kite, a one-line promise, "Create account" (primary) and "I have an account".
- **Login and register:** single column, with the keyboard-aware layout keeping the primary button above the keyboard. Use the right `autoComplete`/`textContentType` values (email, new-password, password). Show inline errors under fields.
- **Verify email:**
  - Six separate digit boxes that auto-advance, accept a pasted code, and use `autoComplete="one-time-code"`.
  - Show the email being verified.
  - Show a resend countdown.
  - Submit automatically once the 6th digit is entered.

### Onboarding (students who haven't completed it)
- A stepper with **one question per screen** and a progress bar at the top. The order is: level, institution and class, district, birth year, language, interests, goals.
- Use selection chips instead of typing where possible.
  - Institution and district use searchable lists backed by `/api/meta/*`, but any typed value is still accepted.
- Birth year uses a picker.
- Show the guardian-consent step only for minors.
- "Back" and "Continue" sit at the bottom. "Skip" is only offered on optional steps.

### Home (tab)
This is a "Today" screen, not a dashboard.
1. A greeting row with the notification bell and its unread badge in the header.
2. A **"Continue learning" hero card**: the course, the next lesson, a progress ring and one big Continue button. This is the main reason to open the app.
3. A streak or weekly-activity strip, if the API provides it.
4. **Today's study tasks** from the planner, shown as a checklist with optimistic toggles.
5. A horizontal "For you" rail of recommended courses.
6. A small, quiet card for verified opportunities with deadlines this week.

### Learn (tab)
- A search field at the top. On focus it shows recent searches and suggestions, never a blank screen.
- Level/category chips in a horizontal scroll.
- Course rails: "In progress", then "Recommended", then everything.
- **Course detail:**
  - A collapsing header (title, level, progress).
  - The lessons shown as a vertical path/timeline with a done, current or upcoming state, instead of a table.
  - A sticky bottom "Start" or "Continue" button.
- **Lesson reader:**
  - Distraction-free: a thin progress bar at the top and comfortable reading width and line height.
  - A sticky bottom bar with "Ask tutor" (opens the tutor with this lesson as context) and "Mark complete".
  - Completing a lesson is a peak moment, followed by "Next lesson".

### AI Tutor (tab)
- A full-screen chat. The composer is pinned above the keyboard and grows up to 5 lines. Send is disabled while a reply is pending.
- An empty state with suggested-prompt chips that fit the student's level.
- A language segmented control (Auto / English / বাংলা) in the header.
- Sources show as small tappable chips under an answer.
- A conversation list is available from the header and opens as a sheet or pushed screen.
- **Practice quiz:**
  - Opens as a modal, one question per screen, with immediate right/wrong feedback and a summary at the end.
  - Show it clearly as practice: tutor quizzes are never stored or scored officially.

### Opportunities (tab)
- **Only verified opportunities**: the backend enforces this, and the UI never invents data.
- A search field and category chips at the top. Advanced filters live in a bottom sheet.
- Cards show the title, organisation, category and a **deadline countdown** ("5 days left"). The countdown turns orange inside 7 days.
- **Detail:**
  - The key facts at the top: deadline, eligibility and amount if present.
  - A sticky bottom bar with "Apply" (in-app browser) and "Track" (planned, applied and so on).
- A "My applications" segment shows the tracked items as a timeline.

### Notifications (pushed from the Home bell)
- Grouped by day: Today, Yesterday, Earlier.
- Unread items have a dot and a slightly tinted background. Swipe right marks one read, and a header action marks all read.
- Tapping a notification opens the screen it refers to, when it has a link.

### Profile (tab)
- A native settings layout: an avatar header with name, email and level, then grouped rows.
  - Groups: Account, Learning (language), Appearance (system/light/dark), About, and Sign out at the bottom.
- Sign out asks for confirmation.

## Product rules (from the root CLAUDE.md, enforced in the UI too)
- Seeded content shows a **Demo** badge (`is_demo`).
- Students only see opportunities with `verification_status == verified`.
- Assessment and quiz scores never come from the LLM. Tutor quizzes are practice only.
- MindCare data never appears on Home or in academic screens.
