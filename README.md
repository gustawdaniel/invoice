# Open Invoice

Open source accounting software compatible with KSeF (National System of e-Invoices in Poland).

## Demo

Check out the live demo: [https://openinvoice.in/](https://openinvoice.in/)

## KSeF 2.0 Integration Status

> [!IMPORTANT]
> **Current Status: Ready for KSeF 2.0 (Feb 2026 Launch)**

This project has been updated to fully comply with the **KSeF 2.0 API** standards effective from February 1st, 2026.

https://ksef.podatki.gov.pl/pliki-do-pobrania-ksef-20/

### Compliance Details
- **API Version**: v2.0 (`/v2` endpoints)
- **Schema**: `FA (3)` / `1-0E`
- **Encryption**: RSA-OAEP with SHA-256
- **Authentication**: JWT-based with `InitToken` flow (including `X-KSeF-Feature: upo-v4-3`)

### Environment & Verification
We have verified the technical implementation against the `api-test.ksef.mf.gov.pl/v2` environment.
- ✅ **Authentication**: Successfully retrieves Auth Token (JWT).
- ✅ **Encryption**: Correctly encrypts symmetric keys using the Ministry of Finance public key.
- ⚠️ **Session Creation**: Currently blocked (`403 Forbidden`) by the KSeF Test Environment restrictions on V2 sessions until the official operational date (Feb 1st).

**Next Steps**:
The codebase is release-ready. Once the KSeF V2 API becomes fully operational for public testing, the connection logic in `scripts/test_ksef_connection.ts` is expected to pass without modification.

---

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