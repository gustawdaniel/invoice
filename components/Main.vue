<template>
  <div>
    <IncomeByMonths/>

    <button class="border px-2 py-1 hover:bg-gray-100" @click="sync">SYNC</button>

    <hr>

    <table class="min-w-full divide-y divide-gray-300">
      <thead class="bg-gray-50">
      <tr>
        <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">lp</th>
        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">id</th>
        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">number</th>
        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">date</th>
        <th scope="col"
            class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 flex justify-between items-center"><span
            class="mr-4">client</span><input v-model="clientNameFilter" type="text" class="w-1/2 py-0"></th>
        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">value</th>
        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">status</th>
        <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
          <span class="sr-only">Edit</span>
        </th>
      </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
      <tr :key="invoice.id" v-for="(invoice, index) in orderedInvoices">
        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{{ index + 1 }}</td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.id }}</td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.number }}</td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.issueDate }}</td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.client.name }}</td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ total(invoice) }} {{ invoice.currency }}</td>
        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {{ status(invoice) }} <span v-if="status(invoice) === 'paid'"><span
            class="text-gray-700">{{ invoice.paid }}</span><br>{{ invoice.paymentDate }}</span>
        </td>
        <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
          <button class="border px-2 py-1 hover:bg-gray-100" @click="printInvoice(invoice)">PRINT</button>
          <button class="border px-2 py-1 hover:bg-gray-100" @click="clone(invoice)">COPY</button>
          <button class="text-indigo-600 hover:text-indigo-900" @click="edit(invoice)">Edit</button>
          <button class="border px-2 py-1 hover:bg-gray-100" @click="remove(invoice.id)">DEL</button>
        </td>
      </tr>
      </tbody>
    </table>

    <div ref="printTemplate" v-show="false">
      <PrintTemplate/>
    </div>

  </div>
</template>

<script lang="ts" setup>
import {total} from '~/helpers/total'
import {status} from '~/helpers/status'
import {invoice, invoices} from "~/store";
import {Invoice} from "~/interfaces/Invoice";
import {computed, nextTick, useRouter} from "#imports";
import axios, {AxiosResponse} from "axios";
import {useRuntimeConfig} from "#app";
import dayjs from "dayjs";
import {deadlineDate} from "~/helpers/deadlineDate";
import {nextInvoiceNumber} from "~/helpers/nextInvoiceNumber";
import {uid} from "uid";
import {printContent} from "~/helpers/printContent";
import {ref} from "vue";

const router = useRouter()
const config = useRuntimeConfig()

const printTemplate = ref<HTMLElement | null>(null);
const clientNameFilter = ref<string>('');

const printInvoice = async (inv: Invoice) => {
    invoice.value = inv;
    await nextTick();
    return printContent(printTemplate.value.innerHTML, `invoice_${invoice.value.number}.pdf`)
}

function sync() {
    axios.get(config.public.JSON_URL + '/invoices').then((res: AxiosResponse<Invoice[]>) => {
        invoices.value = res.data
    })
}

const filteredInvoices = computed<Invoice[]>(() => {
    return invoices.value.filter((inv) => {
        return clientNameFilter.value ? new RegExp(clientNameFilter.value, 'i').test(inv.client.name) : true;
    });
})

const orderedInvoices = computed<Invoice[]>(() => {
    return filteredInvoices.value.sort((a, b) => a.number.split('/').reverse().join('/').localeCompare(b.number.split('/').reverse().join('/')))
})


function edit(invoice: Invoice): void {
    router.push(`/invoice/${invoice.id}`)
}


async function clone(invoice: Invoice): Promise<void> {
    const inv = {...invoice};
    inv.id = uid(); // String(Math.max(...invoices.value.map(inv => Number(inv.id))) + 1)
    inv.paid = 0
    inv.paymentDate = ''
    inv.issueDate = dayjs().format('YYYY-MM-DD')
    inv.deadlineDate = deadlineDate(inv.issueDate, inv.paymentForm)
    inv.number = nextInvoiceNumber(inv.issueDate)
    axios.post(config.public.JSON_URL + '/invoices', inv).then(sync)
}

function remove(id: string): void {
    const yes = confirm('Do you need to remove them?')
    if (yes) {
        axios.delete(config.public.JSON_URL + '/invoices/' + id).then(sync)
    }
}

</script>

<style scoped>

</style>
