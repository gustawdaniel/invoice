<template>
  <div class="mb-8 flex justify-between items-center">
    <div class="pr-5">
      <div class="w-32 h-32 mb-1 overflow-hidden">
        <img class="object-cover w-40 h-40"
             :src="company.logo"
             :alt="company.name"
        />
      </div>
    </div>
    <div>
      <div class="mb-1 flex items-center">
        <label class="w-32 text-gray-800 block font-bold text-xs uppercase tracking-wide">Issued in.</label>
        <div v-text="invoice.issuePlace"></div>
      </div>

      <div class="mb-1 flex items-center">
        <label class="w-32 text-gray-800 block font-bold text-xs uppercase tracking-wide">Issue Date</label>
        <div v-text="invoice.issueDate"></div>
      </div>

      <div class="mb-1 flex items-center">
        <label class="w-32 text-gray-800 block font-bold text-xs uppercase tracking-wide">Sell date:</label>
        <div v-text="invoice.saleDate"></div>
      </div>

    </div>

  </div>

  <div>
    <h2 class="text-lg font-bold mb-6 pb-2 tracking-wider uppercase">Invoice {{ invoice.number }}</h2>
  </div>


  <div class="flex justify-between mb-10">
    <div class="w-1/2">
      <label class="text-gray-800 block mb-2 font-bold text-xs uppercase tracking-wide">Seller:</label>
      <div>
        <div v-text="company.name"></div>
        <div v-text="company.address"></div>
        <div v-text="company.info"></div>
      </div>
    </div>

    <div class="w-1/2">
      <label class="text-gray-800 block mb-2 font-bold text-xs uppercase tracking-wide">Buyer and payer:</label>
      <div>
        <div v-text="invoice.client.name"></div>
        <div v-text="`${invoice.client.street}, ${invoice.client.post} ${invoice.client.city}, Polska`"></div>
        <div v-text="`NIP: ${invoice.client.tin}`"></div>
      </div>
    </div>

  </div>


  <table class="min-w-full divide-y divide-gray-300 text-sm">
    <thead>
    <tr>
      <td>No.</td>
      <td>Product</td>
      <td>Unit</td>
      <td>Qty</td>
      <td>Net price</td>
      <td>Total net</td>
      <td>Vat (%)</td>
      <td>Vat amount</td>
      <td>Total gross</td>
    </tr>
    </thead>
    <tbody>
    <tr v-for="(item, index) in invoice.items" :key="index">
      <td>{{ index + 1 }}</td>
      <td>{{ item.name }}</td>
      <td>{{ item.unit }}</td>
      <td class="text-right">{{ item.quantity }}</td>
      <td class="text-right">{{ displayCurrency(item.priceNet) }}</td>
      <td class="text-right">{{ displayCurrency(item.priceNet * item.quantity) }}</td>
      <td class="text-right">{{ item.vat.name }}</td>
      <td class="text-right">{{ displayCurrency(item.priceNet * item.quantity * (item.vat.value)) }}</td>
      <td class="text-right">{{ displayCurrency(item.priceNet * item.quantity * (1 + item.vat.value)) }}</td>
    </tr>
    </tbody>
    <tfoot>
    <tr>
      <td colspan="5">Total amount:</td>
      <td class="text-right">{{displayCurrency(subTotal)}}</td>
      <td>-</td>
      <td class="text-right">{{displayCurrency(tax)}}</td>
      <td class="text-right">{{displayCurrency(total)}}</td>
    </tr>
    </tfoot>
  </table>

  <div class="flex justify-between mt-10">
    <div class="w-2/5">
      <table class="min-w-full divide-y divide-gray-300">
        <tbody class="divide-y divide-gray-200 bg-white">
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">Payment Type:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{invoice.paymentForm.name}}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">Bank account number:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{invoice.bankAccountNumber}}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">Due date:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{invoice.deadlineDate}}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">Paid:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{displayCurrency(invoice.paid || 0)}}</td>
        </tr>
        <tr>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900">Amount due:</td>
          <td class="whitespace-nowrap py-2 text-sm text-gray-900 text-right">{{displayCurrency(total - (invoice.paid || 0))}}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="w-2/5">
      <div class="flex flex-col justify-between h-full">
        <p class="text-lg">Total amount: {{displayCurrency(total)}}</p>
      <table class="min-w-full divide-y divide-gray-300">
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

  <div class="flex text-center mt-8">
    <div class="w-1/2 p-20">
      <p>Issued</p>
      <div class="border w-3/4 m-auto h-28">
        <img class="m-auto mt-2" :src="company.signature" :alt="invoice.issuerName">
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

</template>

<script setup lang="ts">
import {humanize} from "~/helpers/humanize";
import {invoice, company, subTotal, tax, total} from '~/store';
import {displayCurrency} from '~/helpers/displayCurrency';
</script>
