# create-next-app

A top 1% Next.js template for building modern, enterprise-grade web apps —
opinionated, fully typed, and built to read the same regardless of who
(or what) wrote a given file.

## Stack

Fixed, not à la carte — this template intentionally doesn't support
swapping these out:

- **[Next.js](https://nextjs.org)** (App Router) + **React** — `next@16`, `react@19`
- **TypeScript** — strict mode, no `any`
- **[Tailwind CSS v4](https://tailwindcss.com)** — CSS-first config, OKLCH design tokens
- **[Zod](https://zod.dev)** — the only validation layer, client and server
- **[React Hook Form](https://react-hook-form.com)** — every form, via one generic engine (see below)
- **[Zustand](https://zustand.docs.pmnd.rs)** — app-wide UI state (`useAppStore`, plus a dedicated store for the nav's hover state)
- **[Bun](https://bun.sh)** — package manager and script runner
- **[Biome](https://biomejs.dev)** — linting and formatting (no ESLint/Prettier)
- **[shadcn/ui](https://ui.shadcn.com)** — generated components (Stage 9, not yet integrated — `Card`/`Drawer`/`Background` are hand-built for now)
- **Axios**, **next-themes**, **lucide-react**, **class-variance-authority**, **sonner**

## Getting started

```bash
bun install
cp .env.example .env.local   # then fill in real values — JWT_SECRET especially
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What's in the template

- **Navigation** — responsive header with a hover mega-dropdown (desktop)
  and a slide-in drawer (mobile), plus a full footer. `packages/configs/navigation.config.ts`
  is the single source of truth for both.
- **Auth flow (frontend-complete, no backend wired yet)** — sign in, sign
  up, and a full forgot-password → OTP → reset-password sequence.
- **Contact & profile forms** — same generic form engine as auth, proving
  it out beyond just auth use cases.
- **Design system basics** — buttons (6 variants), inputs (6 types),
  cards, a scoped background component (color/gradient/image/slideshow),
  dark mode via `next-themes`.

Every form on the "no backend yet" list has its submit handler clearly
commented at the point where the real API call goes.

## Scripts

| Command             | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `bun run dev`       | Start the dev server (Turbopack)                        |
| `bun run build`     | Production build                                        |
| `bun run start`     | Serve the production build                              |
| `bun run lint`      | Biome lint                                              |
| `bun run format`    | Biome format (writes)                                   |
| `bun run check`     | Biome lint + format check                               |
| `bun run typecheck` | `tsc --noEmit`                                          |
| `bun run verify`    | All of the above, in sequence — run before opening a PR |

A pre-commit hook (`husky` + `lint-staged`) runs `biome check --write` on
staged files automatically.

## Project structure

```text
src/
├── app/                     # App Router routes, layouts, route groups
│   ├── (auth)/                # signin, signup, forget-password (+ verify-otp, reset-password), signout
│   ├── (protected)/            # profile — layout only otherwise, no route guards yet
│   ├── (public)/               # about, careers, contact
│   ├── api/                   # route handlers (currently just /api/health)
│   ├── blogs/                  # example content route
│   └── dev/                    # internal design-system/typography preview pages
├── assets/                   # fonts, icons, images, logos, svg (source files)
├── components/
│   ├── features/
│   │   ├── auth/                 # AuthForm (thin wrapper over DynamicForm)
│   │   ├── contact/               # ContactForm
│   │   ├── forms/                 # DynamicForm — the shared engine every form above runs on
│   │   ├── home/                  # Hero, Features
│   │   ├── navigation/navbar/      # NavbarDesktop (mega-dropdown), NavbarMobile, NavHamburger
│   │   └── profile/                # ProfileForm, ChangePasswordForm
│   ├── layouts/                 # Header, Footer, AppClientLayout, Theme
│   ├── providers/                # ThemeProvider, NavigationProvider
│   └── ui/                     # buttons/, inputs/, links/, svg/, images/, card/, drawer/, backgrounds/, shadcn/ (Stage 9)
├── docs/dev/                  # the 10-stage architecture guides — read these first
├── packages/
│   ├── configs/                 # app/theme/navigation/role/schema/animation/forms constants
│   ├── env/                     # Zod-validated env modules — the only place process.env is read
│   ├── forms/                   # form.types.ts + {auth,contact,profile}.forms.ts — field/schema config per domain
│   ├── hooks/                   # useDebounce, useLocalStorage, useBreakpoints, useHoverDropdown, etc.
│   ├── metadata/                 # SEO / Open Graph / Twitter card builders
│   ├── schemas/                  # Zod schemas (auth, user, contact, common)
│   ├── services/                 # network calls (auth.services.ts so far)
│   ├── store/                    # Zustand stores (app.store.ts, navigation.store.ts)
│   └── utils/                    # cn, asyncHandler, errors (AppError), animation, date, format, etc.
├── styles/                    # globals.css (tokens), typography.css, ui/*.css (incl. navigation.css — header + footer + drawer + dropdown), animation.css
└── types/                    # ambient/shared TypeScript types (app, api, auth, navigation, globals)
```

## Documentation

The architecture is built out in ten staged guides under `src/docs/dev/`,
each with its own checklist. Current status:

1. ✅ Project initialization
2. ✅ Professional development environment
3. ✅ Enterprise architecture — **the canonical folder-structure reference**
4. ✅ Design system guide
5. ✅ Design implementation guide
6. ✅ Reusable UI guide
7. ✅ Icons guide
8. ✅ Project & env setup
9. ⬜ shadcn/ui integration — not started
10. ◐ API layer guide — `errors.ts`/`asyncHandler.ts` exist and are used throughout; the shared `apiClient` + interceptors/token refresh described in this stage don't yet

See [`AGENTS.md`](./AGENTS.md) for the full conventions checklist and a
list of known landmines worth reading before you touch CSS tokens, the
`components/ui` barrel export, animations, or the hover-dropdown pattern.

Practical how-to guides (as opposed to the architecture-stage docs
above) live under `src/docs/user/` — start with
[`guide-for-dev.md`](./src/docs/user/guide-for-dev.md) if you want to
see what every component actually looks like before you use it,
instead of reading source to guess.

## Environment variables

See [`.env.example`](./.env.example) for the full list, grouped by which
Zod schema validates them (`client.env.ts`, `app.env.ts`, `auth.env.ts`,
`user.env.ts`). Client-readable variables must be prefixed `NEXT_PUBLIC_`;
everything else is server-only.

## License

[CC0 1.0 Universal](./LICENSE) — public domain. Use it for anything.
