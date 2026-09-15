# Repository Baseline

Captured: 2026-09-15
Source revision: `ed1917cb3b7795559db1fb8c238b80a0be5c0368`

## Commands and results

| Check              | Command                         | Result | Finding                                                                                                                                               |
| ------------------ | ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency install | `bun install --frozen-lockfile` | PASS   | 408 packages installed from `bun.lock`                                                                                                                |
| Lint               | `bun run lint`                  | FAIL   | Existing CRLF files conflict with Prettier's LF configuration; a small number of genuine formatting differences are mixed into the output             |
| TypeScript         | `bunx tsc --noEmit`             | FAIL   | Links target missing typed routes `/apply`, `/login`, and `/admin`; strict optional-property errors exist in `src/lib/fsf.ts` and `src/lib/store.tsx` |
| Production build   | `bun run build`                 | PASS   | Vite client, SSR, and Cloudflare-module output generated successfully                                                                                 |

## Baseline classification

- The public application is buildable but not type-clean or lint-clean.
- Missing core routes are an implementation gap, not a reason to weaken TanStack Router types.
- The two optional-property errors are local demo-model defects and should be repaired before domain code becomes a production contract.
- Repository-wide formatting normalization should be isolated from behavioral implementation so reviews remain readable.

## Follow-up

1. Add an explicit `typecheck` package script.
2. Normalize repository text formatting in a dedicated baseline commit.
3. Repair strict optional-property construction without widening types unnecessarily.
4. Implement missing routes only after the golden-flow prototype approval gate.
5. Add unit/integration/e2e test commands; none currently exist.

This file records baseline evidence only. A passing production build does not imply the missing scholarship flows work.
