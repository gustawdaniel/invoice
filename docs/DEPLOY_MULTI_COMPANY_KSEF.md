# Instrukcja wdrożenia: wiele firm + KSeF (dla agenta wdrożeniowego)

Wdrażasz zmianę z commita `feat: multiple companies per account with per-company KSeF test/prod mode`
(branch `feat/multi-company-ksef`, zmergowany do `main`). Właściciel: Daniel Gustaw (gustaw.daniel@gmail.com).
Cel biznesowy: wystawić z appki fakturę `0001/10/2026` od Precise Lab dla Patronad przez produkcyjny KSeF.

## Zasady, których nie łamiesz

- **Nie otwieraj przeglądarki** samodzielnie (reguła z `~/pro/brain/AGENTS.md`). Weryfikacja przez `curl`, `gh`, `ssh`, skrypty.
  Kroki w UI wykonuje Daniel — Ty mu je podajesz i czekasz na wynik.
- **Nie wypisuj sekretów** (`MONGO_URI`, `JWT_SECRET`, `KSEF_SECRET_KEY`, tokenów KSeF) w odpowiedziach ani logach.
- **Nie wysyłaj prawdziwych danych na KSeF TEST** — tam tylko losowe NIP-y (zasada MF).
- **Faktury produkcyjnej w KSeF nie da się cofnąć.** Wysyła ją Daniel przyciskiem po sprawdzeniu danych, nie Ty.
- Push do `main` = automatyczny deploy (GitHub Actions `deploy.yml`). Nie pushuj nic do `main` bez zgody Daniela.

## Co się zmieniło (żebyś wiedział, co weryfikujesz)

- Konto może mieć wiele firm (`users.companyIds`), aktywna firma idzie nagłówkiem `x-company-id`.
- Firma ma `country` (`GE` bez KSeF / `PL` z KSeF), `ksefEnv` (`test`/`prod`/null), `vatExemptionBasis`,
  `ksefTokenEnc` (token KSeF zaszyfrowany AES-256-GCM kluczem `KSEF_SECRET_KEY`).
- Faktura ma pola `ksefNumber`, `ksefXml`, `ksefQrUrl`, `ksefStatus`, `ksefError`, `ksefEnv`. Po przyjęciu przez KSeF jest
  niezmienialna (API zwraca 409 na edycję/usunięcie).
- Nowe endpointy: `GET/POST /companies`, `POST /company/ksef/test-connect`, `GET /company/ksef/auth-request`,
  `POST /company/ksef/auth-signed`, `DELETE /company/ksef`, `POST /invoices/:id/ksef`.
- Biblioteka: `ksef-client-ts@0.14.0` (KSeF API 2.x, FA(3)).

## Stan na 2026-10-07 rano

- Kod jest na `main` i wdrożony (`openinvoice.in`, serwer `lexidrift`, `/root/openinvoice.in`).
- `KSEF_SECRET_KEY` jest w `.env` na serwerze i w kontenerze backendu (sprawdzone: 32 bajty) — **krok 1 zrobiony**.
- Deploy zweryfikowany — **krok 2 zrobiony**. Zdrowie: `curl https://api.openinvoice.in/health` → `{"status":"ok","db":"ok"}`
  (503 gdy baza nieosiągalna — w nocy 6/7.10 klaster Atlas był chwilowo niedostępny, DNS NXDOMAIN; wrócił sam/po wznowieniu).
- Krok 3 (migracja) jest opcjonalny — Prisma uzupełnia brakujące pola wartościami domyślnymi przy odczycie.
- Przepływ z podpisem (jak dla Profilu Zaufanego) przetestowany na KSeF TEST: `scripts/ksef_signed_flow_test.ts`.

Zostały kroki 4–6 (UI, robi Daniel).

## Krok 1 — sekret `KSEF_SECRET_KEY` na serwerze

`docker-compose.yml` przekazuje do backendu zmienną `KSEF_SECRET_KEY` (bez wartości, więc bierze ją z środowiska
`docker compose` na serwerze — zwykle z pliku `.env` w `/root/openinvoice.in/`).

1. Sprawdź, skąd serwer bierze pozostałe zmienne (np. `MONGO_URI`) — ten sam mechanizm użyj dla nowego klucza.
   Host i użytkownik SSH są w sekretach GitHuba (`SSH_HOST`, `SSH_USERNAME`); jeśli ich nie znasz, zapytaj Daniela.
2. Wygeneruj klucz: `openssl rand -base64 32` (musi dać dokładnie 32 bajty po dekodowaniu base64).
3. Dopisz `KSEF_SECRET_KEY=...` obok pozostałych zmiennych. Jeśli Daniel trzyma sekrety w Infisical
   (`https://infisical.preciselab.space`, projekt z `back/.infisical.json`), dodaj go też tam, środowisko `prod`.
   Uwaga: CLI Infisical 0.43.139 z brew woła API v4, którego ten serwer nie ma (404) — działa starszy CLI, np. 0.43.40
   (`gh release download v0.43.40 -R Infisical/cli -p 'cli_0.43.40_darwin_arm64.tar.gz'`).
4. **Klucz trzymaj w bezpiecznym miejscu.** Jego utrata nie psuje faktur, ale wymaga ponownego podłączenia KSeF.

Bez klucza appka działa normalnie, tylko podłączenie KSeF kończy się błędem `KSEF_SECRET_KEY is not set`.
Ustaw go przed krokiem 4, a jeśli deploy już poszedł — po ustawieniu zrób na serwerze `docker compose up -d`.

## Krok 2 — deploy i jego weryfikacja

Merge do `main` uruchamia `.github/workflows/deploy.yml` (build obrazów do DO registry + `docker compose pull && up -d`).

```bash
cd ~/pro/invoice
gh run list --limit 5                      # CI i Deploy to Production dla commita z main
gh run watch <id> --exit-status            # poczekaj na zielone
curl -s https://api.openinvoice.in/        # {"name":"invoice-api","version":"1.0.0"}
```

Jeśli build się wywali: logi `gh run view <id> --log-failed`. Lokalnie odtworzysz:
`cd back && pnpm install && pnpm test && pnpm run build` oraz `cd front && pnpm install && pnpm build`
(front wymaga env `GOOGLE_CLIENT_ID` i `VITE_API_URL`).

## Krok 3 — migracja danych (jednorazowo, bezpieczna)

Prisma wstawia wartości domyślne przy odczycie, więc appka działa i bez tego, ale istniejące dokumenty powinny dostać
nowe pola (`companies.country = "GE"`, `companies.vatExemptionBasis = ""`, `users.companyIds = []`).
Skrypt jest idempotentny i ma tryb dry-run. Uruchom z maszyny z dostępem do produkcyjnego `MONGO_URI`:

```bash
cd ~/pro/invoice/back
MONGO_URI='<produkcyjny>' pnpm exec tsx scripts/migrate_multi_company.ts           # dry run, pokaże liczby
MONGO_URI='<produkcyjny>' pnpm exec tsx scripts/migrate_multi_company.ts --apply
```

Alternatywa w `mongosh` na produkcyjnej bazie:

```js
db.companies.updateMany({country: {$exists: false}}, {$set: {country: "GE"}})
db.companies.updateMany({vatExemptionBasis: {$exists: false}}, {$set: {vatExemptionBasis: ""}})
db.users.updateMany({companyIds: {$exists: false}}, {$set: {companyIds: []}})
```

Istniejąca firma Daniela (gruzińska) dostaje `GE` — to poprawne, jej faktury i wydruki się nie zmieniają.

## Krok 4 — konfiguracja Precise Lab (robi Daniel w UI, Ty prowadzisz)

Podaj Danielowi te kroki i dane:

1. Przeładuj stronę (Ctrl/Cmd+Shift+R), żeby załadować nowy frontend; w razie problemów wyloguj i zaloguj.
2. Dodaj firmę: w nagłówku **„+ New company”** (nazwa, kraj `PL`) albo na stronie **Company** gruzińskiej firmy
   pole „Add Polish company”. Nazwa dowolna — i tak nadpisze ją przycisk z punktu 3.
3. Zakładka **Company** nowej firmy (na górze jest lista kroków konfiguracji z ✅/⬜):
   - NIP: `5272923603` → przycisk **Fill from MF** (Biała Lista MF) wypełni nazwę, adres
     i — bo firma nie jest czynnym podatnikiem VAT — podstawę zwolnienia `Art. 113 ust. 1 ustawy o VAT`.
     Limit Białej Listy to ok. 10 zapytań dziennie; gdyby nie zadziałało, wpisz ręcznie:
     nazwa `PRECISE LAB SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ`, adres `ul. Grzybowska 85A/32, 00-844 Warszawa`.
   - KSeF mode: `Production` → **Save Changes**
4. Sekcja „KSeF production”:
   1. **1. Download request** → plik `ksef-auth-request.xml` (ważny **10 minut**).
   2. Podpis Profilem Zaufanym: https://www.gov.pl/web/gov/podpisz-dokument-elektronicznie-wykorzystaj-podpis-zaufany
      — wgrać plik, podpisać, pobrać podpisany plik (`.xml` albo `.xades` — oba przyjmowane).
   3. Wybrać podpisany plik → **3. Upload signed XML**. Oczekiwany wynik: „connected”.
   Jeśli minęło 10 minut — pobrać request od nowa.

### Najbardziej prawdopodobny problem: brak uprawnień w KSeF

Dla spółki z o.o. KSeF nie rozpoznaje prezesa z KRS automatycznie (powiązanie PESEL↔NIP działa tylko dla JDG).
Osoba podpisująca musi mieć uprawnienia nadane zgłoszeniem **ZAW-FA** (albo podpis pieczęcią kwalifikowaną z NIP spółki).
Wtedy upload zwraca: `KSeF authentication failed: 415 Uwierzytelnianie zakończone niepowodzeniem Brak przypisanych uprawnień...`
(komunikat w appce od razu podpowiada ZAW-FA). W takim przypadku:

- przekaż Danielowi dokładny komunikat,
- poinformuj, że trzeba złożyć ZAW-FA w urzędzie skarbowym dla PESEL Daniela w kontekście NIP 5272923603,
- po nadaniu uprawnień powtórzyć punkt 4.

Inne błędy: weź `ksefError`/komunikat z odpowiedzi i logi backendu (`docker compose logs backend --tail 200` na serwerze).
Kody błędów KSeF: https://github.com/CIRFMF/ksef-docs.

## Krok 5 — faktura dla Patronad (robi Daniel w UI)

1. Zakładka **Clients** → nowy klient: wpisz NIP `1133022863` → **Fill from MF** (sprawdzone: zwraca dokładnie dane z umowy):
   - PATRONAD SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
   - ul. Londyńska 25, `03-921`, Warszawa, kraj `Poland`
2. **New invoice** (będąc w firmie Precise Lab):
   - numer: `0001/10/2026` (podpowiada się sam; format `NNNN/MM/RRRR`), data wystawienia i sprzedaży: dzień wystawienia
   - pozycja (pierwsza pozycja w polskiej firmie domyślnie ma jednostkę `service` i VAT `zw.`): `Wykonanie modułu integracji feedów produktowych dla serwisu net-pocket.space (MVP) zgodnie z Umową o dzieło nr 01/09/2026 z dnia 14.09.2026`,
     jednostka `service`, ilość 1, cena netto `3000`, VAT `zw.`
   - forma płatności: przelew 14 dni, rachunek: `22 1140 2004 0000 3502 7991 1652`
   - waluta `PLN` (inne waluty KSeF w appce jeszcze nieobsługiwane)
   - notka publiczna: pusta (domyślne notki z gruzińskiej firmy nie dotyczą tej faktury)
   - Save
3. Podgląd/wydruk — sprawdź: NIP-y obu stron, kwota 3 000,00 PLN, „Podstawa zwolnienia z VAT: Art. 113 ust. 1 ustawy o VAT”.
4. Lista faktur → **SEND KSEF** → potwierdzenie (produkcja, nieodwracalne).
   Wynik: pod numerem faktury pojawia się numer KSeF. Wydruk zawiera kod QR i numer KSeF.
   Przycisk **XML** pobiera prawnie wiążący XML faktury z KSeF.
5. Wydruk (PDF) Daniel wysyła Patronad mailem — sama faktura i tak trafia do nich przez KSeF.

## Krok 6 — zamknięcie

- Zadanie w ClickUp: https://app.clickup.com/t/869fbjfmd — dodaj komentarz z numerem faktury i numerem KSeF,
  ustaw status na zamknięty (po potwierdzeniu Daniela).
- Dopisz wpis do `~/pro/brain/doc/projects/net-pocket/README.md` (numer KSeF, data).

## Wycofanie (rollback)

Jeśli produkcja przestanie działać po deployu:

```bash
cd ~/pro/invoice
git revert -m 1 <merge-commit> && git push origin main   # tylko za zgodą Daniela; uruchomi ponowny deploy
```

Nowe pola w Mongo są addytywne — stara wersja appki je ignoruje, cofnięcie kodu nie wymaga cofania danych.

## Testy, gdybyś coś zmieniał

- `cd back && pnpm test` — w tym walidacja FA(3) względem XSD MF (wymaga `xmllint`).
- Pełny przepływ na KSeF TEST: lokalny backend + lokalna baza, potem
  `API_URL=http://localhost:5055 MONGO_URI=<lokalny> pnpm exec tsx scripts/ksef_e2e_test.ts`
  (skrypt odmawia działania na nielokalnej bazie). Lokalne Mongo z replica set:
  `docker run -d --name invoice-mongo-dev -p 27019:27017 mongo:7 --replSet rs0 --bind_ip_all` + `rs.initiate(...)`,
  URI `mongodb://localhost:27019/invoice_dev?replicaSet=rs0&directConnection=true`.
