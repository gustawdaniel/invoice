<template>
  <div v-if="invoice">
  <div class="mb-8 flex justify-between items-center">
    <div class="pr-5">
      <div v-if="companyStore.company.logo" class="w-32 h-32 mb-1 overflow-hidden">
        <img class="object-cover w-40 h-40"
             :src="companyStore.company.logo"
             :alt="companyStore.company.name"
        />
      </div>
    </div>
    <div>
      <div v-if="!pl" class="mb-1 flex items-center">
        <label class="w-32 text-gray-800 block font-bold text-xs uppercase tracking-wide">Issued in.</label>
        <div v-text="invoice.issuePlace"></div>
      </div>

      <div class="mb-1 flex items-center">
        <label class="w-32 text-gray-800 block font-bold text-xs uppercase tracking-wide">{{ t.issueDate }}</label>
        <div v-text="invoice.issueDate"></div>
      </div>

      <!-- sale date is required only when it differs from the issue date -->
      <div v-if="!pl || invoice.saleDate !== invoice.issueDate" class="mb-1 flex items-center">
        <label class="w-32 text-gray-800 block font-bold text-xs uppercase tracking-wide">{{ t.saleDate }}</label>
        <div v-text="invoice.saleDate"></div>
      </div>
    </div>

  </div>

  <div>
    <h2 class="text-lg font-bold mb-6 pb-2 tracking-wider uppercase">{{ t.invoice }} {{ invoice.number }}</h2>
  </div>


  <div class="flex justify-between mb-10">
    <div class="w-1/2">
      <label class="text-gray-800 block mb-2 font-bold text-xs uppercase tracking-wide">{{ t.seller }}</label>
      <div>
        <div v-text="companyStore.company.name"></div>
        <div v-text="companyStore.company.address"></div>
        <div v-if="pl" v-text="`NIP: ${companyStore.company.tin}`"></div>
        <div v-else v-text="companyStore.company.info"></div>
      </div>
    </div>

    <div class="w-1/2">
      <label class="text-gray-800 block mb-2 font-bold text-xs uppercase tracking-wide">{{ t.buyer }}</label>
      <div v-if="invoice.client">
        <div v-text="invoice.client.name"></div>
        <div v-text="`${invoice.client.street}, ${invoice.client.post} ${invoice.client.city}, ${invoice.client.country ?? 'Polska'}`"></div>
        <div v-text="`${invoice.client.tinName ?? 'NIP'}: ${invoice.client.tin}`"></div>
      </div>
    </div>

  </div>


  <table class="min-w-full divide-y divide-gray-300 text-sm">
    <thead>
    <tr>
      <td>{{ t.no }}</td>
      <td>{{ t.product }}</td>
      <td>{{ t.unit }}</td>
      <td>{{ t.qty }}</td>
      <td>{{ t.netPrice }}</td>
      <td>{{ t.totalNet }}</td>
      <td>{{ t.vatRate }}</td>
      <td v-if="showVat">{{ t.vatAmount }}</td>
      <td v-if="showVat">{{ t.totalGross }}</td>
    </tr>
    </thead>
    <tbody>
    <tr v-for="(item, index) in invoice.items" :key="index">
      <td>{{ index + 1 }}</td>
      <td>{{ item.name }}</td>
      <td>{{ unitLabel(item.unit, pl) }}</td>
      <td class="text-right">{{ item.quantity }}</td>
      <td class="text-right">{{ displayCurrency(item.priceNet) }}</td>
      <td class="text-right">{{ displayCurrency(item.priceNet * item.quantity) }}</td>
      <td class="text-right">{{ vatLabel(item.vat.name) }}</td>
      <td v-if="showVat" class="text-right">{{ displayCurrency(item.priceNet * item.quantity * (item.vat.value)) }}</td>
      <td v-if="showVat" class="text-right">{{ displayCurrency(item.priceNet * item.quantity * (1 + item.vat.value)) }}</td>
    </tr>
    </tbody>
    <tfoot>
    <tr>
      <td colspan="5">{{ t.totalAmount }}</td>
      <td class="text-right">{{displayCurrency(subTotal)}}</td>
      <td>-</td>
      <td v-if="showVat" class="text-right">{{displayCurrency(tax)}}</td>
      <td v-if="showVat" class="text-right">{{displayCurrency(total)}}</td>
    </tr>
    </tfoot>
  </table>

  <p v-if="pl && exempt" class="mt-4 text-sm">
    Podstawa zwolnienia z VAT: {{ companyStore.company.vatExemptionBasis }}
  </p>

  <div class="flex justify-between mt-10">
    <div class="w-2/5">
      <table class="min-w-full divide-y divide-gray-300">
        <tbody class="divide-y divide-gray-200 bg-white">
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">{{ t.paymentType }}</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{ paymentName }}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">{{ t.bankAccount }}</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{invoice.bankAccountNumber}}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">{{ t.dueDate }}</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{invoice.deadlineDate}}</td>
        </tr>
        <tr v-if="!pl">
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">Paid:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{displayCurrency(invoice.paid || 0)}}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">{{ t.amountDue }}</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{displayCurrency(total - (invoice.paid || 0))}}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="w-2/5">
      <div class="flex flex-col justify-between h-full">
        <p class="text-lg">{{ t.totalAmount }} {{displayCurrency(total)}}</p>
      <table v-if="!pl" class="min-w-full divide-y divide-gray-300">
        <tbody class="divide-y divide-gray-200 bg-white">
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">In words:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{ humanize(Math.round(total)) }} and {{Math.round(100*(total - (Math.round(total))))}}/100 {{invoice.currency.toUpperCase()}}</td>
        </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>

  <p v-if="invoice.publicNote" class="mt-8 text-gray-700 text-sm">{{invoice.publicNote}}</p>

  <!-- KSeF visualization: verification QR code with the KSeF number under it -->
  <div v-if="invoice.ksefNumber && invoice.ksefQrUrl" class="mt-8 flex flex-col items-start">
    <div v-html="qrSvg(invoice.ksefQrUrl)"></div>
    <p class="text-xs mt-1">{{ invoice.ksefNumber }}</p>
    <p v-if="invoice.ksefEnv === 'test'" class="text-xs text-red-600">KSeF TEST — invoice without legal effect</p>
  </div>

  <div v-if="!pl" class="flex text-center mt-8">
    <div class="w-1/2 p-20">
      <p>Issued</p>
      <div class="border w-3/4 m-auto h-28">
        <img class="m-auto mt-2" :src="companyStore.company.signature" :alt="invoice.issuerName">
        <p>{{invoice.issuerName}}</p>
      </div>
      <p class="text-xs">Signature of the person authorized to issue an invoice</p>
    </div>
    <div class="w-1/2 p-20">
      <p>Collected</p>
      <div class="border w-3/4 m-auto h-28 flex items-end justify-center">
        <p>{{invoice.receiverName}}</p>
      </div>
      <p class="text-xs">Signature of the person authorized to collect the invoice</p>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import {humanize} from "~/helpers/humanize";
import { subTotal, tax, total} from '~/store';
import {displayCurrency} from '~/helpers/displayCurrency';
import {isVatExempt, unitLabel, vatLabel} from '~/helpers/vatLabel';
import {qrSvg} from '~/helpers/qrSvg';
import {useCompanyStore} from "~/store/company";
import {useInvoiceStore} from "~/store/invoice";
const invoiceStore = useInvoiceStore();
const companyStore = useCompanyStore();

const invoice = computed(() => invoiceStore.invoice);

// Polish companies get Polish labels and only the elements required by art. 106e VAT act
const pl = computed(() => companyStore.company.country === 'PL');
const exempt = computed(() => invoice.value?.items.some(item => isVatExempt(item.vat.name)) ?? false);
// VAT amounts may be omitted when nothing is taxed (art. 106e ust. 4 pkt 3)
const showVat = computed(() => !pl.value || (invoice.value?.items.some(item => item.vat.value > 0) ?? true));

const PL_PAYMENT: Record<string, string> = {
  cash: 'Gotówka', prepaid: 'Przelew (przedpłata)', '14d': 'Przelew 14 dni', '7d': 'Przelew 7 dni',
  card: 'Karta płatnicza', delivery: 'Za pobraniem', check: 'Czek', other: 'Inna',
};
const paymentName = computed(() => {
  const form = invoice.value?.paymentForm;
  if (!form) return '';
  return pl.value ? (PL_PAYMENT[form.key] ?? form.name) : form.name;
});

const t = computed(() => pl.value ? {
  issueDate: 'Data wystawienia', saleDate: 'Data sprzedaży', invoice: 'Faktura',
  seller: 'Sprzedawca:', buyer: 'Nabywca:', no: 'Lp.', product: 'Nazwa towaru lub usługi', unit: 'J.m.',
  qty: 'Ilość', netPrice: 'Cena netto', totalNet: 'Wartość netto', vatRate: 'Stawka VAT',
  vatAmount: 'Kwota VAT', totalGross: 'Wartość brutto', totalAmount: 'Razem:',
  paymentType: 'Forma płatności:', bankAccount: 'Numer rachunku:', dueDate: 'Termin płatności:',
  amountDue: 'Do zapłaty:',
} : {
  issueDate: 'Issue Date', saleDate: 'Sell date:', invoice: 'Invoice',
  seller: 'Seller:', buyer: 'Buyer and payer:', no: 'No.', product: 'Product', unit: 'Unit',
  qty: 'Qty', netPrice: 'Net price', totalNet: 'Total net', vatRate: 'Vat (%)',
  vatAmount: 'Vat amount', totalGross: 'Total gross', totalAmount: 'Total amount:',
  paymentType: 'Payment Type:', bankAccount: 'Bank account number:', dueDate: 'Due date:',
  amountDue: 'Amount due:',
});
</script>
