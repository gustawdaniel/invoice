<template>
  <div class="mb-2 md:mb-1 md:flex items-center"  v-if="invoiceStore.invoice">
    <label class="w-32 text-gray-800 block font-bold text-sm uppercase tracking-wide">Issue Date</label>
    <span class="mr-4 inline-block hidden md:block">:</span>
    <div class="flex-1">
      <input
          class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-48 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 js-datepicker"
          type="date" id="datepicker1" placeholder="eg. 17 Feb, 2020" v-model="invoiceStore.invoice.issueDate"
          @input="onIssueDateUpdate"
          pattern="\d{4}-\d{2}-\d{2}">
    </div>
  </div>

  <div class="mb-2 md:mb-1 md:flex items-center"  v-if="invoiceStore.invoice">
    <label class="w-32 text-gray-800 block font-bold text-sm uppercase tracking-wide">Sale date</label>
    <span class="mr-4 inline-block hidden md:block">:</span>
    <div class="flex-1">
      <input
          class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-48 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 js-datepicker-2"
          id="datepicker2" type="date" placeholder="eg. 17 Mar, 2020" v-model="invoiceStore.invoice.saleDate"
          pattern="\d{4}-\d{2}-\d{2}">
    </div>
  </div>

  <div class="mb-2 md:mb-1 md:flex items-center"  v-if="invoiceStore.invoice">
    <label class="w-32 text-gray-800 block font-bold text-sm uppercase tracking-wide">Deadline Date</label>
    <span class="mr-4 inline-block hidden md:block">:</span>
    <div class="flex-1">
      <input
          class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-48 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 js-datepicker-2"
          id="datepicker2" type="date" placeholder="eg. 17 Mar, 2020" v-model="invoiceStore.invoice.deadlineDate"
          pattern="\d{4}-\d{2}-\d{2}">
    </div>
  </div>

  <div class="mb-2 md:mb-1 md:flex items-center"  v-if="invoiceStore.invoice">
    <label class="w-32 text-gray-800 block font-bold text-sm uppercase tracking-wide">Paid at</label>
    <span class="mr-4 inline-block hidden md:block">:</span>
    <div class="flex-1">
      <input
          class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-48 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500 js-datepicker-2"
          id="datepicker2" type="date" placeholder="eg. 17 Mar, 2020" v-model="invoiceStore.invoice.paymentDate"
          @input="paymentDataUpdated"
          pattern="\d{4}-\d{2}-\d{2}">
    </div>
  </div>
</template>

<script setup lang="ts">
import {useInvoiceStore} from "~/store/invoice";
const invoiceStore = useInvoiceStore();
import {total} from "~/helpers/total";
import {nextInvoiceNumber} from "~/helpers/nextInvoiceNumber";
import dayjs from "dayjs";

function paymentDataUpdated() {
  if(!invoiceStore.invoice) return;

  if(invoiceStore.invoice.paymentDate) {
    invoiceStore.invoice.paid = total(invoiceStore.invoice)
  } else {
    invoiceStore.invoice.paid = 0
  }
}

function onIssueDateUpdate() {
    console.log("onIssueDateUpdate");
  if(!invoiceStore.invoice) return;


  invoiceStore.invoice.saleDate = invoiceStore.invoice.issueDate

    console.log(invoiceStore.invoice.issueDate);

    if(['14d', '7d'].includes(invoiceStore.invoice.paymentForm?.key)) {
        const days = Number(invoiceStore.invoice.paymentForm?.key.replace('d',''))
        invoiceStore.invoice.deadlineDate = dayjs(invoiceStore.invoice.issueDate).add(days,'d').format('YYYY-MM-DD')
    }

    invoiceStore.invoice.number = nextInvoiceNumber(invoiceStore.invoice.issueDate)
}
</script>

<style scoped>

</style>
