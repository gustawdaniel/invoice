# Working on openinvoice

openinvoice issues invoices for Polish KSeF and for clients abroad, and keeps the books of small companies.
AI agents work through its MCP server; humans review and approve in the app.

## Map

- `back/` — Fastify + Prisma (MongoDB). REST API for the app, MCP server for agents (`src/services/agents/mcpServer.ts`),
  KSeF (`src/services/ksef/`), bookkeeping (`src/controllers/books/`, `src/services/books/`). Tests: `pnpm test`.
- `web/` — SvelteKit (Svelte 5) app, keyboard first. Logic in `src/lib/*.ts` with tests (`pnpm test`), types (`pnpm check`).
  See `web/README.md` for running it locally.
- Deploy: every push to `main` builds both images and deploys (`.github/workflows/deploy.yml`).

## Rules for changes

- Agents never send anything legally binding: production KSeF goes through a human approval.
- A record a human confirmed (`status: confirmed`) stays as it is; agents change it only when the human asks (`override_confirmed`),
  and may set `confirmed` themselves for a decision the human made in the chat. Loaders are idempotent (`externalId`).
- Money is rounded per item to grosze, like the invoice shows it.

## The private workspace: `private/`

The repository is public. The owner's private material — bookkeeping notes, a knowledge base, one-off scripts with
client names, links to source documents — lives in `private/` at the root. Git ignores it (`.gitignore`); search tools
still see it (`.ignore`). It exists only on the owner's machine.

If `private/` exists, start with `private/README.md`: it says what is there and how the owner works.

Never copy anything from `private/` (names, numbers, amounts, notes) into tracked files, commits, pull requests, issues,
public artifacts or screenshots. Sample data in tests and on the landing page is invented on purpose. CI fails if a file
under `private/` is ever tracked.
