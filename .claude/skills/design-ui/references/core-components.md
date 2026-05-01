# `@ugi/core` shared components

Look here **first** when picking a component. If one of these fits, import it from `@ugi/core` instead of reimplementing.

When you need API details, open the source under `libs/core/src/components/<Name>/`.

| Component | Import | When to reach for it |
|---|---|---|
| `UAvatarImage` | `@ugi/core` | User/entity avatar with image fallback |
| `UConfirmDialog` | `@ugi/core` | Confirm-before-action dialog. Pair with `useConfirmDialog()` composable. |
| `UCopyableContent` | `@ugi/core` | Inline value with a one-click copy button (IDs, emails, tokens) |
| `UEmptyState` | `@ugi/core` | **Default empty state** for any list/table. Always with icon + title + description + primary action. |
| `UEnumSelect` | `@ugi/core` | Select bound to a TS enum, labels resolved via i18n |
| `UErrorView` | `@ugi/core` | Full-section error state (failed query / 500 / network) |
| `UFileAttachment` | `@ugi/core` | Render a single uploaded file as a chip with filename + size + remove |
| `UFileUploader` | `@ugi/core` | Drag-and-drop file upload, multi-file, integrates with `useUploader` |
| `UImage` | `@ugi/core` | Image with loading/error fallback. Prefer over `<img>` |
| `UImageUploader` | `@ugi/core` | Image upload with crop/preview |
| `ULoader` | `@ugi/core` | Full-section spinner. Use sparingly — prefer `USkeleton`. |
| `ULogo` | `@ugi/core` | Project logo |
| `URepeatableCollection` | `@ugi/core` | Add/remove rows for collection fields in forms |
| `URichTextEditor` | `@ugi/core` | Rich-text editor for long-form content |

## Composables (auto-import via `@ugi/core`)

| Composable | When to use |
|---|---|
| `useDebounce` | Debounce a search input or expensive computation |
| `useError` | Centralised error handling — push to error store + toast |
| `useUploader` | Drives `UFileUploader`/`UImageUploader` — gives `progress`, `error`, `result` |
| `useConfirmDialog` | Imperative confirm: `await confirm({ title, description })` returns boolean |

## Decision rule

1. Need to ask user for confirmation? → `useConfirmDialog` + `UConfirmDialog`
2. Need to show "no data"? → `UEmptyState` (never a custom div)
3. Need to upload? → `useUploader` + `UFileUploader`/`UImageUploader`
4. Need a loading view? → `USkeleton` (Nuxt UI) for known layouts; `ULoader` for unknown
5. Anything else → Nuxt UI v4 first, then native, then custom in module's `components/`
