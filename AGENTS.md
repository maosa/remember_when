<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Linting

`npm run verify` (lint + typecheck + test) runs on `pre-push` and in CI; keep it green. Every `eslint-disable` must have a justification comment and a row in [docs/lint-exceptions.md](docs/lint-exceptions.md) — see that file before adding or removing one.
