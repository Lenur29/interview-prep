---
name: design-ui
description: Build production-quality UI for the UGI.Cloud admin app using Nuxt UI v4, @ugi/core shared components, and project conventions. Use when creating a new screen/page/component, redesigning an existing one, porting a design from Figma, or when the user says "build a page / design this screen / create a UI for / redesign this".
when_to_use: Activate when generating or restructuring Vue 3 UI in apps/admin or libs/core. Skip for plain logic refactors, type-only changes, schema/migration work, or pure backend tasks.
allowed-tools: Read Glob Grep Edit Write
---

# Design UI — UGI.Cloud admin

Task: $ARGUMENTS

Goal: ship UI that looks like a designer who knows this product built it — not generic AI output.

## Pre-flight (do BEFORE markup)

1. **Catalog the toolbox** before reaching for a `<div>`:
   - Call `mcp__nuxt-ui__list_components` to see what Nuxt UI v4 ships. For ones you'll use, fetch the API with `mcp__nuxt-ui__get_component`.
   - Read [`references/core-components.md`](references/core-components.md) for the `@ugi/core` shared catalogue. If the description fits, open the source under `libs/core/src/components/<Name>/` for props.
   - Skim **one or two existing pages** in the same module (`apps/admin/src/modules/<related>/pages/`) to copy the page-header / empty / loading / dialog patterns.

2. **Write a one-paragraph design brief in your head** before code:
   - Primary action of this screen, secondary actions
   - States: empty / loading / error / success / partial-data
   - Layout shift: <640px vs ≥640px
   - Audience (admin / student / support) — affects copy register

   If the brief feels under-specified, ask the user **one** targeted question before continuing. Don't ask three.

## Component selection (priority order)

1. `@ugi/core` — UFileUploader / UImageUploader / UEmptyState / UConfirmDialog / etc. Don't reimplement.
2. Nuxt UI v4 — for everything else.
3. Native HTML — only when neither covers it.
4. Custom component — last resort. Place in the module's `components/` folder. Never put it in `libs/core/` unless the user explicitly asks for shared.

Hard rules:
- **Never** `import { UButton } from '@nuxt/ui'` — Nuxt UI components & composables are auto-imported.
- **Never** reach for another UI library (Vuetify, Element, Headless UI…).
- **Never** invent a Tailwind color class for what Nuxt UI's role colors cover (`primary`, `secondary`, `success`, `error`, `warning`, `info`, `neutral`).
- **Never** specify generic types on Apollo composables — Documents already infer them.

## Visual rules

- **Tokens over magic values.** Nuxt UI color roles + Tailwind 4 spacing scale only. No hex except in one-off illustrations.
- **Density first.** Default Nuxt UI density. Don't shrink padding/text to fit content — paginate, collapse, or split the screen.
- **Hierarchy through size + weight**, not color. Reserve strong color for actions and statuses.
- **Empty states have a name and a way out.** Use `UEmptyState` from `@ugi/core` with icon + title + soft description + one primary action.
- **Loading states are skeletons** when the layout is known (`USkeleton`); spinners only when it isn't.
- **Errors inline first, toasts second.** Field errors next to inputs; `useToast()` for global "can't fetch the page" cases.

## Iconography

Only `i-lucide-*` via `<UIcon>` or component `icon` prop. Never inline SVG, never sprites.

Pick by intent: `i-lucide-trash-2` for delete, `i-lucide-pencil` for edit, `i-lucide-arrow-up-right` for "open in new", `i-lucide-search` for search, `i-lucide-filter` for filters.

## Layout

- Mobile-first; layer up at `sm:`, `md:`, `lg:`. Avoid `xl:` unless the page is dense data.
- Container queries when a component adapts to its slot (sidebar vs main): `@container` + `@md:`.
- Page wrapper pattern (copy from existing modules):
  ```vue
  <div class="flex flex-col gap-6 p-6">
    <header class="flex items-center justify-between gap-4">…</header>
    <section class="flex-1">…</section>
  </div>
  ```

## Copy

- Ukrainian only. No English in markup or `t()` arguments.
- Add new keys to `apps/admin/src/core/i18n/locales/uk.ts` using `module.feature.keyName` (camelCase, dot-separated).
- For **bot-facing** strings (`apps/api/src/modules/bot/`), follow the tone-of-voice rules in `CLAUDE.md` — always «ти», emoji on greetings/success/errors, escape hatch to `@dekanat_ugi`.

## Forms (valibot)

- Required strings **must** be `v.pipe(v.string(), v.nonEmpty(), …)` — that order, no exceptions. Skipping `nonEmpty()` produces "invalid type" errors instead of "required".
- Use `UFormField` + a Nuxt UI input. Errors render automatically.
- Submit button: `:loading="<verb>ing"`, disabled during mutation.
- Don't pass per-call messages for standard validators (string/email/url/min/max/regex/picklist) — global Ukrainian messages are registered in `libs/core/src/valibot/i18n.ts`.

## Component file order (non-negotiable)

```vue
<script setup lang="ts">
// 1. Vue core   2. Vue Router/Pinia   3. third-party
// 4. @ugi/*     5. local imports      6. type imports
// 7. props      8. emits              9. composables
// 10. state    11. computed          12. methods
// 13. watchers 14. lifecycle
</script>

<template>…</template>
```

No `<style scoped>` unless justified (third-party override, animation Tailwind can't express). Add a one-line comment if you do.

## Apollo / GraphQL

- All `.graphql` files live in `libs/graphql/src/<feature>/{queries,mutations,fragments,subscriptions}/` — kebab-case names. Never inside an admin module.
- After adding a `.graphql` file, run `pnpm codegen` and import `XxxDocument` from `@ugi/graphql`.
- Naming for loading state:
  - `useQuery(FooDocument)` → `loading` (or `fooLoading` if multiple)
  - `useMutation(UpdateFooDocument)` → `updating` (action verb)

## Self-review (mandatory before "done")

Walk this list explicitly before declaring complete:

- [ ] Used `mcp__nuxt-ui__list_components` and picked the right component (not a `<div>` reimplementation)?
- [ ] Checked `@ugi/core` for an existing component before going custom?
- [ ] All three states handled: empty / loading / error?
- [ ] Mobile <640px works without horizontal scroll?
- [ ] Focus rings visible, tab order makes sense?
- [ ] Copy in Ukrainian and added to `uk.ts`?
- [ ] No manual imports of Nuxt UI components / composables?
- [ ] Lucide icons only?
- [ ] Nuxt UI color roles only (no `text-blue-500` for "primary")?
- [ ] Component block & import order correct?
- [ ] `pnpm type-check:admin` would pass (run it or note skipped)?

If the change is non-trivial, end with: "Once you have it running, `/review-ui <route>` will audit the live page."

## Additional resources

- [`references/core-components.md`](references/core-components.md) — index of `@ugi/core` shared components

## When NOT to use this skill

- The user is fixing a typo, renaming a variable, or doing a non-visual refactor.
- The user is asking purely about types or schema.
- The user wants to commit / open PR / run tests — those have their own skills.
