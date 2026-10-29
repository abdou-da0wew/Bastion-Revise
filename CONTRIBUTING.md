# Contributing
1. Fork, branch from `main`, keep PRs focused.
2. `bun install`, then make `bun run check` pass (strict tsc + tests) and `bun audit` clean.
3. Add a regression test for every bug fix — several tests here are literal audit PoCs.
4. Conventional commits (`fix:`, `feat:`, `docs:`…). CI (typecheck, tests, audit, Docker build) must be green.
