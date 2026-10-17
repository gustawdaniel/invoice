# Open Invoice

Open source accounting software compatible with KSeF (National System of e-Invoices in Poland).

## Demo

Check out the live demo: [https://openinvoice.in/](https://openinvoice.in/)

---

## Companies and KSeF

One account can own many companies (switcher in the header). Each company has a country:

- **GE** – plain invoices, no KSeF.
- **PL** – invoices are sent to [KSeF 2.0](https://github.com/CIRFMF/ksef-docs) as FA(3) XML, using
  [`ksef-client-ts`](https://github.com/Flopsstuff/ksef-client-ts).

Like Stripe, there is a **Test mode** switch in the header. Live and test mode have separate invoices (clients are shared),
and every Polish company has two KSeF connections with their own tokens:

- live mode → production KSeF (`api.ksef.mf.gov.pl`), legally binding;
- test mode → KSeF DEMO (`api-demo.ksef.mf.gov.pl`), the pre-production environment: real NIP and data, no legal effect.

Connect each by pasting a token from Aplikacja Podatnika KSeF ([production](https://ap.ksef.mf.gov.pl/web/tokens/generate-token),
[DEMO](https://ap-demo.ksef.mf.gov.pl)) or by signing an auth request once with Profil Zaufany. Tokens are stored encrypted
(`KSEF_SECRET_KEY`). An invoice is sent to the environment of its own mode, never the other one.

Invoices accepted by KSeF store their KSeF number, XML and verification QR link, and can no longer be edited or deleted.

Checks: `pnpm test` in `back` (FA(3) XSD validation needs `xmllint`) and `tsx scripts/ksef_signed_flow_test.ts`
(signature based connection and sending on KSeF TEST with a fake NIP). Data from the single KSeF mode per company is
moved to live/test mode on start (`src/migrations/ksefModes.ts`, idempotent).

## AI agents (MCP)

Agents can work with the app through the MCP server at `https://api.openinvoice.in/mcp` (stateless streamable HTTP).
Create a key in **Settings > Agent access**, then e.g. in Claude Code:

```bash
claude mcp add --transport http openinvoice https://api.openinvoice.in/mcp --header "Authorization: Bearer oi_..."
```

A key acts as the user who created it, only on `/mcp`. Tools: `list_companies`, `create_company`, `update_company`,
`lookup_nip`, `list_clients`, `create_client`, `list_invoices`, `get_invoice`, `create_invoice_draft`,
`update_invoice_draft`, `validate_ksef_invoice`, `request_ksef_send`, `send_to_ksef_demo`.

Production KSeF stays human: `request_ksef_send` only marks the draft, the user approves it with
**APPROVE & SEND KSEF** (or dismisses it) on the invoice list. Changing the draft cancels the request. Agents cannot
connect KSeF, change the NIP of a connected company, delete anything or manage keys.
Test mode invoices (`test_mode: true`) can be sent to KSeF DEMO directly with `send_to_ksef_demo`.

Admins (`ADMIN_EMAILS`) see every company and its users at `/admin`.

## Features

- **KSeF Integration**: Seamlessly obtain tokens and manage invoices in compliance with Polish regulations.
- **Open Source**: Built for the community, transparent and extensible.
- **Modern Stack**:
  - **Frontend**: Nuxt 3 (Vue 3), TailwindCSS, Pinia.
  - **Backend**: Node.js, Fastify, Prisma, MongoDB.
  - **Testing**: Vitest.

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm
- Docker (optional, for deployment)

### Installation

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    # Frontend
    cd front
    pnpm install

    # Backend
    cd back
    pnpm install
    ```

3.  Set up environment variables (see `.env.example` in both directories).

### Running Locally

**Frontend:**
```bash
cd front
pnpm dev
```

**Backend:**
```bash
cd back
pnpm dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[ISC](LICENSE)