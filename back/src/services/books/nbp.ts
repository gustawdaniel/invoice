// Average NBP exchange rates (table A), fetched once and kept in the database. The books convert a foreign currency
// amount at the rate of the last working day before the operation (art. 30 ustawy o rachunkowości, art. 15a CIT).
import {prisma} from "../../db";
import {previousDay} from "./ledger";

const API = 'https://api.nbp.pl/api/exchangerates/rates/a';

interface NbpSeries {
    rates: { no: string; effectiveDate: string; mid: number }[];
}

async function fetchRange(currency: string, from: string, to: string): Promise<NbpSeries['rates']> {
    const response = await fetch(`${API}/${currency.toLowerCase()}/${from}/${to}/?format=json`);
    if (response.status === 404) return []; // no table in the range (holidays)
    if (!response.ok) throw new Error(`NBP ${currency} ${from}..${to}: ${response.status}`);
    return ((await response.json()) as NbpSeries).rates;
}

function addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// rates for the currencies and dates the books need; missing ones are fetched from NBP in ranges of at most 93 days
export async function loadNbpRates(needs: { currency: string; date: string }[]) {
    const byCurrency = new Map<string, Map<string, number>>();
    const wanted = new Map<string, string[]>();
    for (const n of needs) {
        if (n.currency === 'PLN') continue;
        wanted.set(n.currency, [...(wanted.get(n.currency) ?? []), n.date]);
    }
    for (const [currency, dates] of wanted) {
        const sorted = [...new Set(dates)].sort();
        const from = addDays(sorted[0], -10), to = previousDay(sorted[sorted.length - 1]);
        let stored = await prisma.nbpRates.findMany({where: {currency, date: {gte: from, lte: to}}});
        const known = new Set(stored.map((r) => r.date));
        // fetch the ranges that hold a needed day without a known rate in the 10 days before it
        const lacking = sorted.filter((date) => ![...Array(10).keys()].some((i) => known.has(addDays(date, -1 - i))));
        if (lacking.length) {
            for (let start = addDays(lacking[0], -10); start <= previousDay(lacking[lacking.length - 1]); start = addDays(start, 93)) {
                const end = [addDays(start, 92), previousDay(lacking[lacking.length - 1])].sort()[0];
                for (const r of await fetchRange(currency, start, end)) {
                    await prisma.nbpRates.upsert({
                        where: {currency_date: {currency, date: r.effectiveDate}},
                        create: {currency, date: r.effectiveDate, mid: r.mid, table: r.no},
                        update: {mid: r.mid, table: r.no},
                    });
                }
            }
            stored = await prisma.nbpRates.findMany({where: {currency, date: {gte: from, lte: to}}});
        }
        byCurrency.set(currency, new Map(stored.map((r) => [r.date, r.mid])));
    }
    // the rate of the last working day before the date
    return (currency: string, date: string): number | undefined => {
        const rates = byCurrency.get(currency);
        if (!rates) return undefined;
        for (let day = previousDay(date), i = 0; i < 10; day = previousDay(day), i++) {
            const mid = rates.get(day);
            if (mid) return mid;
        }
        return undefined;
    };
}
