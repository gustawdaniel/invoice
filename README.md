# Open Invoice

Open source accounting software compatible with KSeF (National System of e-Invoices in Poland).

## Demo

Check out the live demo: [https://openinvoice.in/](https://openinvoice.in/)

---

## Companies and KSeF

One account can own many companies (switcher in the header). Each company has a country:

- **GE** – plain invoices, no KSeF.
- **PL** – invoices are sent to [KSeF 2.0](https://github.com/CIRFMF/ksef-docs) as FA(3) XML, using
  [`ksef-client-ts`](https://github.com/Flopsstuff/ksef-client-ts). KSeF mode is chosen per company, like Stripe test/live:
  - `test` – `api-test.ksef.mf.gov.pl`, connect with one click (self-signed certificate). Use a fake NIP only.
  - `prod` – download the auth request XML, sign it once with Profil Zaufany or a qualified signature, upload it.
    The app then generates a KSeF token and stores it encrypted (`KSEF_SECRET_KEY`).

Invoices accepted by KSeF store their KSeF number, XML and verification QR link, and can no longer be edited or deleted.

Checks: `pnpm test` in `back` (FA(3) XSD validation needs `xmllint`) and
`tsx scripts/ksef_e2e_test.ts` against a local backend and database (full flow on KSeF TEST).
After deploying the schema change run `tsx scripts/migrate_multi_company.ts --apply` once.

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