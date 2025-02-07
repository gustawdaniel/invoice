<template>
  <div class="grid grid-cols-2 items-center flex my-1">
    <label for="email" class="text-right mr-2">Issue Place</label>
    <input type="email" name="email" id="email"
           class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
           placeholder="City"
           v-model="invoice.issuePlace"
    />
  </div>
  <div class="grid grid-cols-2 items-center flex my-1">
    <label for="email" class="text-right mr-2">Currency</label>

    <CurrencyInput v-model="invoice.currency"/>
  </div>
  <div class="grid grid-cols-2 items-center flex my-1">
    <label for="email" class="text-right mr-2">Language</label>

    <LangInput v-model="invoice.lang"/>
  </div>
  <div class="grid grid-cols-2 items-center flex my-1">
    <label for="email" class="text-right mr-2">Payment Form</label>

    <PaymentFormInput v-model="invoice.paymentForm"/>
  </div>
</template>

<script setup lang="ts">
import {invoice} from "~/store";
import CurrencyInput from "~/components/CurrencyInput.vue";
</script>

<style scoped>

</style>