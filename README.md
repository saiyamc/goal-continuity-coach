# Goal Continuity Coach

Goal Continuity is an AI-assisted case-workspace and personal goal agent built for The Ken Case Competition 2026 opening, “Sticking to the goal.” It helps teams move from a broad productivity problem to a focused user wedge, evidence-backed insight, and a continuity loop that adapts between full, short, and emergency versions of a goal.

## What it includes

- Case-workspace chat with five stages: Find the wedge, Gather evidence, Design the agent, Stress-test the rails, and Shape the submission.
- Long-input coaching for dense, multi-person case notes.
- Evidence-versus-hypothesis guardrails and personalised fallback analysis when the model is unavailable or slow.
- Persistent goals with full, short, and emergency actions.
- Six-hour reminder scheduling with completion-window suppression.
- Manus OAuth authentication, database persistence, and server-side LLM access.

## Local development

Requirements: Node.js 22+, pnpm 10+, and a MySQL-compatible database for persistence.

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

The app expects the runtime environment variables provided by the Manus WebDev full-stack template, including `DATABASE_URL`, `JWT_SECRET`, OAuth variables, and the server-side built-in Forge variables. Do not commit `.env` files or secrets. For reminder email delivery, configure `REMINDER_EMAIL_WEBHOOK_URL` with a trusted mail-provider endpoint.

## Production build

```bash
pnpm build
pnpm start
```

## Project structure

- `client/` — React UI and case-workspace screens.
- `server/` — tRPC procedures, authentication, database helpers, LLM integration, and scheduled callbacks.
- `drizzle/` — database schema and migrations.
- `shared/` — shared constants and types.

## Tests

Run the Vitest suite with `pnpm test`. The suite covers authentication logout behavior, six-hour reminder scheduling, reminder message formatting, and personalised dense-input fallback analysis.

## Collaboration notes

The model prompt intentionally separates evidence, hypotheses, design choices, and open questions. Contributions should preserve that evidence discipline and avoid inventing user research, quotes, survey results, or product capabilities.
