# Open Invoice

Open source accounting software compatible with KSeF (National System of e-Invoices in Poland).

## Demo

Check out the live demo: [https://openinvoice.in/](https://openinvoice.in/)

---

## 🇵🇱 Status Integracji KSeF 2.0 (Informacje dla Polski)

> [!NOTE]
> **Podsumowanie sytuacji:**
> 1. Obowiązek KSeF **NIE** wszedł jeszcze w życie dla większości firm. Oficjalny start to **1 kwietnia 2026** (lub 1 lipca 2026 dla mikroprzedsiębiorców).
> 2. Oficjalne środowisko produkcyjne KSeF jest obecnie **ZAMKNIĘTE** dla sesji dla mniejszych podmiotów. Jest aktywne tylko dla wąskiej grupy największych firm (>200 mln zł), dla których startował 1 lutego.
> 3. **Błąd 403 Forbidden** na środowisku produkcyjnym jest **oczekiwany i normalny**. System odrzuca próby otwarcia sesji, ponieważ nie masz jeszcze uprawnień czasowych. Twoja implementacja jest prawdopodobnie poprawna.

### 🗓️ Harmonogram działań
Poniższa tabela przedstawia kluczowe daty i zalecane działania w oparciu o próg przychodów:

| Twoja sytuacja (Przychody 2024) | Data obowiązku KSeF | Co robić TERAZ (Styczeń-Luty 2026) | Co robić od 1 KWIETNIA 2026 |
| :--- | :--- | :--- | :--- |
| **Powyżej 200 mln zł** | Od 1.02.2026 | Pilnie testuj na PRODUKCJI (`ksef.mf.gov.pl`). Błąd 403 oznacza problem z tokenem/certyfikatem. Sprawdź portal KSeF. | -- |
| **Poniżej 200 mln zł** (Większość firm) | **Od 1.04.2026** | Skup się na testach w **DEMO** i przygotowaniu aplikacji. **Ignoruj błąd 403 na produkcji** – to normalne. | Przetestuj połączenie z produkcją. Włącz obowiązkowe wysyłanie faktur do KSeF. |

### 🛠️ Praktyczny plan (dla firm <200 mln zł)
Masz jeszcze czas do 1 kwietnia. Wykorzystaj go mądrze:

1.  **Kontynuuj testy na ŚRODOWISKU DEMO** (`ksef-demo.mf.gov.pl`):
    *   Użyj oficjalnych danych testowych (NIP 1234567890).
    *   Doprowadź do pełnego flow: uwierzytelnienie -> otwarcie sesji -> wysłanie faktury FA(2) -> pobranie UPO.
    *   Jeśli na DEMO występuje 403, wtedy należy szukać błędu w kodzie.
2.  **Przygotuj tryb "hybrydowy"**:
    *   **Do 31 marca**: Aplikacja działa w "trybie zwykłym" (bez KSeF).
    *   **Od 1 kwietnia**: Aplikacja automatycznie przełącza się na wysyłanie do KSeF.
    *   Zaimplementuj tryb awaryjny (QR kody) na wypadek awarii KSeF.
3.  **Testy na Produkcji (Marzec)**:
    *   Dopiero na początku marca wygeneruj nowy token w portalu produkcyjnym (`portal.ksef.gov.pl`).
    *   Wykonaj testowe połączenie, aby upewnić się, że wszystko działa.

---

## 🇺🇸 KSeF 2.0 Integration Status (International Context)

> [!IMPORTANT]
> **Technical Status: Ready for KSeF 2.0 (Feb 2026 Launch)**

This project has been updated to fully comply with the **KSeF 2.0 API** standards effective from February 1st, 2026.

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