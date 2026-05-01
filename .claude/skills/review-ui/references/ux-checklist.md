# UX/UI audit rubric

Walk this top-to-bottom. Skip a category only if it doesn't apply (e.g. no forms on this page).

## A11y (accessibility)

- [ ] All interactive controls reachable by keyboard (Tab/Shift+Tab/Enter/Space)
- [ ] Visible focus ring on every focusable element (not `outline: none`)
- [ ] Buttons that look like buttons are `<button>` (not `<div role="button">` or styled `<a>`)
- [ ] Links go places (`<a href>`); buttons do things (`<button>`)
- [ ] Every form input has an associated `<label>` or `aria-label`
- [ ] Error messages are announced (`role="alert"` or `aria-live`)
- [ ] Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI components
- [ ] Images have meaningful `alt` (or `alt=""` if decorative)
- [ ] Heading hierarchy is sequential — no `h1` → `h3` jumps
- [ ] Page has exactly one `<main>`; landmarks (`<nav>`, `<header>`, `<footer>`) are present
- [ ] No keyboard trap (modals: ESC closes, focus stays inside until closed)

## Visual hierarchy

- [ ] You can tell the primary action at a glance (size + weight + color)
- [ ] Secondary actions are clearly subordinate (ghost/outline variant)
- [ ] Destructive actions use `error` color and require confirmation (`UConfirmDialog`)
- [ ] Headings, body text, captions form a clear scale (≥3 levels of contrast)
- [ ] Spacing rhythm is consistent (multiples of 4px / Tailwind scale; no random `gap-[13px]`)
- [ ] Color used purposefully — not decorative; status colors mean status
- [ ] No competing focal points (more than one "look here" per section)

## States

- [ ] **Empty:** has icon + title + description + one primary action (use `UEmptyState`)
- [ ] **Loading:** skeleton when layout is known; spinner only when it isn't
- [ ] **Error:** has a recovery action (retry / contact / go home)
- [ ] **Success:** confirmation is clear (toast for ephemeral, inline for persistent)
- [ ] **Disabled:** explains *why* (tooltip / helper text), doesn't just sit there
- [ ] **Hover / active / focus** — distinct, not just identical to default
- [ ] **Partial-data:** the page survives a missing field / null relation / empty array

## Mobile (< 640px)

- [ ] No horizontal scroll on any viewport down to 360px
- [ ] Tap targets ≥ 44×44 px (especially icon-only buttons)
- [ ] Sticky elements (header, footer, FAB) don't overlap content
- [ ] Modal/drawer fits the viewport (no clipped buttons)
- [ ] Long copy wraps, doesn't ellipsis the primary information
- [ ] Tables: horizontal scroll on the table container, not the page

## Forms

- [ ] Field labels above the input (not placeholders-as-labels)
- [ ] Required marker visible (`*` or "(required)")
- [ ] Validation triggers on blur / submit, not every keystroke (unless live-format)
- [ ] Errors show next to the offending field, not just at the top
- [ ] Submit button shows `loading` and is disabled during mutation
- [ ] Form has logical tab order (top-to-bottom, left-to-right)
- [ ] Date / number / phone inputs use the appropriate `inputmode`

## Copy (Ukrainian)

- [ ] Tone matches the audience: admin = neutral-direct, bot/student = «ти» + emoji
- [ ] Errors apologize and point to the next step (no raw codes / English / stack traces)
- [ ] Buttons name the action verb, not "OK / Cancel" (e.g. «Зберегти», «Скасувати», «Видалити курс»)
- [ ] No mixed languages in one screen
- [ ] Microcopy explains *why* a field is needed, not just *what* it is

## Performance

- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] No long tasks > 50ms during interaction
- [ ] No images > 500 KB without a Reason
- [ ] No blocking script / CSS in the critical path
- [ ] GraphQL: no N+1 sub-queries; no `useQuery` re-fetching on every keystroke (use `useDebounce`)
- [ ] No console errors / Vue warnings on initial render

## Consistency (across the app)

- [ ] Icons match siblings on similar pages
- [ ] Spacing between sections matches the rest of the module
- [ ] Typography scale used = the same one used elsewhere
- [ ] Buttons in the page-header position look like buttons in other page-headers
- [ ] Filters/search bar position consistent with sibling list pages
- [ ] Dialogs have the same footer pattern (Cancel left or right — pick one and stick to it)

## Smell tests (cross-cutting)

- [ ] If you closed your eyes and reopened them, would you still know which app this is?
- [ ] Would removing 30% of the visual noise hurt the user? If no — remove it.
- [ ] Could a screen-reader user complete the primary action without sighted help?
- [ ] Could a colorblind user distinguish status (success vs error vs warning)?
- [ ] If the API returned `[]` instead of data, does the page still feel finished?
