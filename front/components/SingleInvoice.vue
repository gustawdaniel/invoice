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
              title="Save!"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="save">
            <ArrowDownOnSquareIcon class="h-6 w-6" aria-hidden="true"/>

          </div>
        </div>

        <div class="relative mr-4 inline-block">
          <div
              :title="mode === 'edit' ? 'Preview Invoice' : 'Edit invoice'"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="toggleMode()">
            <DocumentTextIcon v-if="mode === 'edit'" class="h-6 w-6" aria-hidden="true"/>
            <PencilIcon v-if="mode === 'preview'" class="h-6 w-6" aria-hidden="true"/>
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
            <CircleStackIcon class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>


        <form class="relative mr-4 inline-block">
          <input type="file" id="import" hidden accept="application/json" @change="importJson">
          <label for="import"
                 title="Import Json"
                 class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center">
            <ArrowUpTrayIcon class="h-6 w-6" aria-hidden="true"/>
          </label>
        </form>

        <div class="relative mr-4 inline-block">
          <div
              title="Reload Page"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
              @click="reload">
            <ArrowPathIcon class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>


        <div class="relative inline-block">
          <div
              title="Load Seed"
              class="text-gray-500 cursor-pointer w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-300 inline-flex items-center justify-center"
          >
            <ServerIcon class="h-6 w-6" aria-hidden="true"/>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mode === 'edit'">
      <div class="flex mb-8 justify-between">
        <div v-if="invoiceStore.invoice">
          <div class="mb-2 md:mb-1 md:flex items-center">
            <label class="w-32 text-gray-800 block font-bold text-sm uppercase tracking-wide">Invoice No.</label>
            <span class="mr-4 inline-block hidden md:block">:</span>
            <div class="flex-1">
              <input
                  class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-48 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                  id="inline-full-name" type="text" placeholder="eg. #INV-100001" v-model="invoiceStore.invoice.number">
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
              id="inline-full-name" type="text" placeholder="Your company name" v-model="companyStore.company.name">

          <input
              class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              id="inline-full-name" type="text" placeholder="Your company address"
              v-model="companyStore.company.address">

          <input
              class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              id="inline-full-name" type="text" placeholder="Additional info" v-model="companyStore.company.info">
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
import LogoInput from "~/components/LogoInput.vue";

// import { invoice, invoices} from "~/store";
import ItemsInput from "~/components/ItemsInput.vue";
import DatesInput from "~/components/DatesInput.vue";
import RightInput from "~/components/RightInput.vue";
import DetailsInput from "~/components/DetailsInput.vue";

const companyStore = useCompanyStore();

type Mode = 'edit' | 'preview';

const mode = ref<Mode>('edit');

const printTemplate = ref<HTMLElement | null>(null);
import {
  PencilIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CircleStackIcon,
  PrinterIcon,
  DocumentTextIcon,
  ServerIcon,
  ArrowDownOnSquareIcon
} from '@heroicons/vue/20/solid'
import {nextInvoiceNumber} from "~/helpers/nextInvoiceNumber";
import {printContent} from "~/helpers/printContent";
import {useCompanyStore} from "~/store/company";
import {useInvoiceStore} from "~/store/invoice";
import {defaultInvoice} from "~/helpers/defaultInvoice";
import Swal from 'sweetalert2';

const router = useRouter();

const props = defineProps({
  id: {
    type: String,
    required: false
  }
})

const invoiceStore = useInvoiceStore();

onMounted(async () => {
  if (props.id) {
    invoiceStore.invoice = invoiceStore.invoices.find(invoice => invoice.id === props.id) ?? null;
  } else {
    if (!invoiceStore.invoice) {
      invoiceStore.invoice = defaultInvoice();
    }
    invoiceStore.invoice.number = nextInvoiceNumber(invoiceStore.invoice.issueDate)
  }
})

async function syncInvoices() {
  await invoiceStore.getInvoices();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

async function save() {
  try {
    if (!invoiceStore.invoice) return;

    if (invoiceStore.invoice.id) { // edit
      await invoiceStore.updateInvoice(invoiceStore.invoice);
    } else { // create new
      await invoiceStore.addInvoice(invoiceStore.invoice);
    }
    return router.push('/')
  } catch (error) {
    await Swal.fire({
      title: 'Error',
      text: getErrorMessage(error),
      icon: 'error',
    })
  }
}

const printInvoice = async () => {
  if (!printTemplate.value) return;
  if(!invoiceStore.invoice) return;

  return printContent(printTemplate.value.innerHTML, `invoice_${invoiceStore.invoice.number}.pdf`)
}

const reload = () => {
  window.location.reload()
}

const toggleMode = () => {
  mode.value = mode.value === 'edit' ? 'preview' : 'edit';
}

const exportJson = () => {
  if(!invoiceStore.invoice) return;

  const blob = new Blob([JSON.stringify(invoiceStore.invoice)], {type: 'application/json'})
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `invoice_${invoiceStore.invoice.number}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function readFileAsync(file: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        resolve('');
      }
    };

    reader.onerror = reject;

    reader.readAsText(file);
  })
}

const importJson = async (event: any) => {
  const file = event.target.files[0];
  let contentBuffer = await readFileAsync(file);
  const invoiceData = JSON.parse(contentBuffer);
  console.log(invoiceData);
  invoiceStore.invoice = invoiceData;
}

</script>
