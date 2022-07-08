<template>
  <div  class="w-1/2">

  <div class="grid grid-cols-6 items-center flex my-1">
    <label class="col-span-1 text-right mr-2">Issuer Name</label>
    <input type="text"
           class="col-span-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
           placeholder="Your Name"
           v-model="invoice.issuerName"
    />
    <label class="col-span-1 text-right mr-2">Receiver Name</label>
    <input type="text"
           class="col-span-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
           placeholder="Receiver Name"
           v-model="invoice.receiverName"
    />
  </div>

  <div class="grid grid-cols-6 items-center flex my-1">
    <label class="col-span-1 text-right mr-2">Account Number</label>
    <input type="text"
           class="col-span-5 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
           placeholder="Account number"
           v-model="invoice.bankAccountNumber"
    />
  </div>

  <div class="grid grid-cols-6 items-center flex my-1">
    <label class="col-span-1 text-right mr-2">Vat Account Number</label>
    <input type="text"
           class="col-span-5 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
           placeholder="Vat account number"
           v-model="invoice.vatBankAccountNumber"
    />
  </div>



  </div>
  <div  class="w-1/2">
    <div class="grid grid-cols-6 items-center flex my-1">
      <label class="col-span-1 text-right mr-2">Note on invoice (printed)</label>
      <textarea type="text"
                rows="5"
                class="col-span-5 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Vat account number"
                v-model="invoice.publicNote"
      />
    </div>

    <div class="grid grid-cols-6 items-center flex my-1">
      <label class="col-span-1 text-right mr-2">Note for seller (private)</label>
      <textarea type="text"
                class="col-span-5 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Vat account number"
                v-model="invoice.privateNote"
      />
    </div>
  </div>

</template>

<script setup lang="ts">
import {invoice} from "~/store";
</script>
