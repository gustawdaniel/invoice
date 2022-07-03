<template>
  <div
      class="container mx-auto py-6 px-4"
      v-cloak
  >
    <div class="flex justify-between">
      <h2 class="text-2xl font-bold mb-6 pb-2 tracking-wider uppercase">Invoice</h2>
      <div>
        <div class="relative mr-4 inline-block">
          <div
              :title="mode === 'edit' ? 'Preview Invoice' : 'Edit invoice'"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="toggleMode()">
            <DocumentTextIcon v-if="mode === 'edit'" class="h-6 w-6" aria-hidden="true"/>
            <PencilAltIcon v-if="mode === 'preview'" class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>


        <div class="relative mr-4 inline-block">
          <div
              title="Print this invoice!"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="printInvoice()">
            <PrinterIcon class="h-6 w-6" aria-hidden="true"/>

          </div>
        </div>

        <div class="relative mr-4 inline-block">
          <div
              title="Export Json"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="exportJson">
            <DatabaseIcon class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>


        <form class="relative mr-4 inline-block">
          <input type="file" id="import" hidden accept="application/json" @change="importJson">
          <label for="import"
              title="Import Json"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center">
            <UploadIcon class="h-6 w-6" aria-hidden="true"/>
          </label>
        </form>

        <div class="relative mr-4 inline-block">
          <div
              title="Reload Page"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="reload">
            <RefreshIcon class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>


        <div class="relative inline-block">
          <div
              title="Load Seed"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="seed">
            <ServerIcon class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mode === 'edit'">
      <div class="flex mb-8 justify-between">
        <div>
          <div class="mb-2 md:mb-1 md:flex items-center">
            <label class="w-32 text-gray-800 block font-bold text-sm uppercase tracking-wide">Invoice No.</label>
            <span class="mr-4 inline-block hidden md:block">:</span>
            <div class="flex-1">
              <input
                  class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-48 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                  id="inline-full-name" type="text" placeholder="eg. #INV-100001" v-model="invoice.number">
            </div>
          </div>
        </div>

        <div>
          <DatesInput/>
        </div>

        <div>
          <RightInput/>
        </div>

        <LogoInput/>
      </div>

      <div class="flex flex-wrap justify-between mb-8">
        <ClientInput/>
        <div class="w-full md:w-2/5">
          <label class="text-gray-800 block mb-1 font-bold text-sm uppercase tracking-wide">From:</label>
          <input
              class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              id="inline-full-name" type="text" placeholder="Your company name" v-model="company.name">

          <input
              class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              id="inline-full-name" type="text" placeholder="Your company address" v-model="company.address">

          <input
              class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              id="inline-full-name" type="text" placeholder="Additional info" v-model="company.info">
        </div>
      </div>

      <ItemsInput/>

      <div class="flex mt-6">
        <DetailsInput/>
      </div>
    </div>

    <!-- Print Template -->
    <div ref="printTemplate" v-show="mode === 'preview'">
      <PrintTemplate/>
    </div>
    <!-- /Print Template -->


  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import LogoInput from "~/components/LogoInput.vue";

import {company, clients, invoice} from "~/store";
import clientsSeed from "~/seed/clients.json";
import companySeed from "~/seed/company.json";
import ItemsInput from "~/components/ItemsInput.vue";
import DatesInput from "~/components/DatesInput.vue";
import RightInput from "~/components/RightInput.vue";
import DetailsInput from "~/components/DetailsInput.vue";
import dayjs from "dayjs";

type Mode = 'edit' | 'preview';

const mode = ref<Mode>('edit');

const printTemplate = ref<HTMLElement>(null);
import {
  PencilAltIcon,
  RefreshIcon,
  UploadIcon,
  DatabaseIcon,
  PrinterIcon,
  DocumentTextIcon,
  ServerIcon
} from '@heroicons/vue/outline'


const printInvoice = () => {
  const printContents = printTemplate.value.innerHTML;
  const printWindow = window.open('', '', 'height=400,width=800');
  printWindow.document.write('<html lang="en" style="font-size: 13px"><head>');
  printWindow.document.write(document.head.innerHTML);
  printWindow.document.write('</head><body >');
  printWindow.document.write(printContents);
  printWindow.document.write('</body></html>');
  printWindow.document.close();

  printWindow.addEventListener('afterprint', () => {
    printWindow.close();
  });

  printWindow.document.title = `invoice_${invoice.value.number}.pdf`;

  printWindow.print();
}

const reload = () => {
  window.location.reload()
}

const seed = () => {
  localStorage.clear();
  clients.value = clientsSeed
  company.value = companySeed
}

const toggleMode = () => {
  mode.value = mode.value === 'edit' ? 'preview' : 'edit';
}

const generateInvoiceNumber = (number: number) => {
  invoice.value.number = `${String(number).padStart(4, '0')}/${dayjs().format('MM/YYYY')}`
};

const exportJson = () => {
  const blob = new Blob([JSON.stringify(invoice.value)], {type: 'application/json'})
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `invoice_${invoice.value.number}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function readFileAsync(file):Promise<string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();

    reader.onload = () => {
      if(typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        resolve('');
      }
    };

    reader.onerror = reject;

    reader.readAsText(file);
  })
}

const importJson = async (event) => {
  const file = event.target.files[0];
  let contentBuffer = await readFileAsync(file);
  const invoiceData = JSON.parse(contentBuffer);
  console.log(invoiceData);
  invoice.value = invoiceData;
}

onMounted(() => {
  generateInvoiceNumber(1)
})
</script>