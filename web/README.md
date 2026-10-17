# openinvoice web

The SvelteKit frontend: agent-first (MCP), keyboard-first (vim keys, ⌘K palette).
It replaces `../front` once accepted; until then both exist.

```sh
pnpm install
cp .env.example .env   # VITE_API_URL: production API by default, http://localhost:5000 for a local backend
pnpm dev               # http://localhost:3000
pnpm test              # domain logic: amounts, numbering, statuses, search, the palette's command parser
pnpm check             # types
```

Google sign-in works only on origins listed for the OAuth client in Google Cloud Console.
Until `http://localhost:3000` is there, use **Developer login** on `/login` (dev builds only):
paste the token from openinvoice.in (`JSON.parse(localStorage.userStore).token` in its console).

## Map

- `src/lib/invoice.ts`, `search.ts`, `command.ts`: pure logic, tested in `logic.test.ts`
- `src/lib/state/`: session, API client, data store, keys (vim bindings), toasts, overlays
- `src/lib/ui/`: shell, palette, keymap, invoice paper (print), dialogs
- `src/routes/`: inbox, invoices (list, editor), clients, books, agents, company, admin, print, login

Keys: `?` in the app lists them. Search syntax: `is:unpaid client:patro month:2026-10 >1000 -is:paid`.
