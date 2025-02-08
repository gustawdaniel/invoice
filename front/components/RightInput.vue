<template>
  <div class="grid grid-cols-2 items-center flex my-1" v-if="invoiceStore.invoice">
    <label for="email" class="text-right mr-2">Issue Place</label>
    <input type="email" name="email" id="email"
           class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
           placeholder="City"
           v-model="invoiceStore.invoice.issuePlace"
    />
  </div>
  <div class="grid grid-cols-2 items-center flex my-1" v-if="invoiceStore.invoice">
    <label for="email" class="text-right mr-2">Currency</label>

    <CurrencyInput v-model="invoiceStore.invoice.currency"/>
  </div>
  <div class="grid grid-cols-2 items-center flex my-1" v-if="invoiceStore.invoice">
    <label for="email" class="text-right mr-2">Language</label>

    <LangInput v-model="invoiceStore.invoice.lang"/>
  </div>
  <div class="grid grid-cols-2 items-center flex my-1" v-if="invoiceStore.invoice">
    <label for="email" class="text-right mr-2">Payment Form</label>

    <PaymentFormInput v-model="invoiceStore.invoice.paymentForm"/>
  </div>
</template>

<script setup lang="ts">
import {useInvoiceStore} from "~/store/invoice";
const invoiceStore = useInvoiceStore();

import CurrencyInput from "~/components/CurrencyInput.vue";
</script>

<style scoped>

</style>