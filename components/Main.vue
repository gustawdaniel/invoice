<template>
  <div>
    <IncomeByMonths/>

    <div class="flex items-center justify-between">
      <button class="border px-2 py-1 hover:bg-gray-100" @click="sync">SYNC</button>

      <USelectMenu v-model="selectedColumns" :options="columns" multiple>
        <UButton
            icon="i-heroicons-view-columns"
            color="gray"
            size="xs"
            class="ml-10"
        >
          Columns
        </UButton>
      </USelectMenu>
    </div>

    <hr>

    <!--    <UTable :rows="orderedInvoices" :columns="columnTable" :ui="{thead: 'bg-gray-50', base: 'min-w-full table-auto'}">-->
    <!--      <template #client-header="{}"><span class="flex items-center justify-between">-->
    <!--        <span class="mr-4">client</span><input v-model="clientNameFilter" type="text" class="w-1/2 py-0 border">-->
    <!--      </span></template>-->
    <!--      <template #actions-header="{}"><span></span></template>-->

    <!--      <template #lp-data="{ index }"><span class="text-gray-900">{{ index + 1 }}</span></template>-->
    <!--      <template #id-data="{ row: invoice }"><span class="whitespace-nowrap">{{ invoice.id }}</span></template>-->
    <!--      <template #date-data="{ row: invoice }"><span class="whitespace-nowrap issue-date">{{ invoice.issueDate }}</span></template>-->
    <!--      <template #client-data="{ row: invoice }"><span class="whitespace-nowrap">{{ invoice.client.name }}<br><span class="text-gray-400">{{firstItemName(invoice)}}</span></span>-->
    <!--      </template>-->
    <!--      <template #value-data="{ row: invoice }"><span class="whitespace-nowrap">{{ total(invoice) }} {{ invoice.currency }}</span></template>-->
    <!--      <template #status-data="{ row: invoice }"><span class="whitespace-nowrap">{{ status(invoice) }} <span-->
    <!--          v-if="status(invoice) === 'paid'"><span-->
    <!--          class="text-gray-700">{{ invoice.paid }}</span><br>{{ invoice.paymentDate }}</span></span></template>-->

    <!--      <template #actions-data="{ row: invoice }">-->
    <!--        <button class="border px-2 py-1 hover:bg-gray-100 text-black" @click="printInvoice(invoice)">PRINT</button>-->
    <!--        <button class="border px-2 py-1 hover:bg-gray-100 text-black" @click="clone(invoice)">COPY</button>-->
    <!--        <button class="text-indigo-600 hover:text-indigo-900" @click="edit(invoice)">Edit</button>-->
    <!--        <button class="border px-2 py-1 hover:bg-gray-100 text-black" @click="remove(invoice.id)">DEL</button>-->
    <!--      </template>-->
    <!--    </UTable>-->


    <table class="min-w-full divide-y divide-gray-300">
      <thead class="bg-gray-50">
      <tr>
        <th v-if="showColumn('lp')" scope="col"
            class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">lp
        </th>
        <th v-if="showColumn('id')" scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          id
        </th>
        <th v-if="showColumn('number')" scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          number
        </th>
        <th v-if="showColumn('date')" scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          date
        </th>
        <th v-if="showColumn('client')" scope="col"
            class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 flex justify-between items-center"><span
            class="mr-4">client</span><input v-model="clientNameFilter" type="text" class="w-1/2 py-0 border"></th>
        <th v-if="showColumn('value')" scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          value
        </th>
        <th v-if="showColumn('status')" scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          status
        </th>
        <th v-if="showColumn('actions')" scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
          <span class="sr-only">Edit</span>
        </th>
      </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
      <tr :key="invoice.id" v-for="(invoice, index) in orderedInvoices"
          :class="{'bg-violet-100': isFutureDate(invoice.issueDate)}">
        <td v-if="showColumn('lp')"
            class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{{ index + 1 }}
        </td>
        <td v-if="showColumn('id')" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.id }}</td>
        <td v-if="showColumn('number')" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{
            invoice.number
          }}
        </td>
        <td v-if="showColumn('date')" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{
            invoice.issueDate
          }}
        </td>
        <td v-if="showColumn('client')" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{
            invoice.client.name
          }}<br><span
              class="text-gray-400">{{ firstItemName(invoice) }}</span></td>
        <td v-if="showColumn('value')" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ total(invoice) }}
          {{ invoice.currency }}
        </td>
        <td v-if="showColumn('status')" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {{ status(invoice) }} <span v-if="status(invoice) === 'paid'"><span
            class="text-gray-700">{{ invoice.paid }}</span><br>{{ invoice.paymentDate }}</span>
        </td>
        <td v-if="showColumn('actions')"
            class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
          <button class="border px-2 py-1 hover:bg-gray-100" @click="printInvoice(invoice)">PRINT</button>
          <button class="border px-2 py-1 hover:bg-gray-100" @click="clone(invoice)">COPY</button>
          <button class="text-indigo-600 hover:text-indigo-900" @click="edit(invoice)">Edit</button>
          <button class="border px-2 py-1 hover:bg-gray-100" @click="remove(invoice.id)">DEL</button>
        </td>
      </tr>
      </tbody>
      <InvoicesTableFoot
          :label-colspan="['lp','id','number','date','client'].reduce((p,n) => p + Boolean(showColumn(n)),0)"
          :show-value="showColumn('value')"
          :invoices="orderedInvoices.map(inv => ({currency: inv.currency, paid: inv.paid}))"
          currency="PLN"
      />
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
import {snakecase} from "snakecase";
import {b} from "vite-node/types-516036fa";

const router = useRouter()
const config = useRuntimeConfig()

const printTemplate = ref<HTMLElement | null>(null);
const clientNameFilter = ref<string>('');
const {company} = useCompany();

const printInvoice = async (inv: Invoice) => {
    invoice.value = inv;
    await nextTick();

    console.log("company.value", company.value);

    return printContent(printTemplate.value.innerHTML, `${['invoice', invoice.value.number, snakecase(company.value.name), snakecase(inv.client.name)].join('_')}.pdf`)
}

async function sync() {
    return axios.get(config.public.JSON_URL + '/invoices').then((res: AxiosResponse<Invoice[]>) => {
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
    await axios.post(config.public.JSON_URL + '/invoices', inv);
    await sync();
    grayBgOfFutureInvoices()
}

function remove(id: string): void {
    const yes = confirm('Do you need to remove them?')
    if (yes) {
        axios.delete(config.public.JSON_URL + '/invoices/' + id).then(sync)
    }
}

const columns = [{
    key: 'lp',
    label: 'lp',
}, {
    key: 'id',
    label: 'id',
}, {
    key: 'number',
    label: 'number',
}, {
    key: 'date',
    label: 'date',
}, {
    key: 'client',
    label: 'client',
}, {
    key: 'value',
    label: 'value',
}, {
    key: 'status',
    label: 'status',
}, {
    key: 'actions',
    label: 'actions',
}]

const selectedColumns = ref(columns.filter(c => c.key !== 'id'))
const columnTable = computed(() => columns.filter((column) => selectedColumns.value.includes(column)))

function firstItemName(invoice: Invoice): string {
    try {
        return invoice.items[0].name;
    } catch {
        return '';
    }
}

function isFutureDate(date: string): boolean {
    return dayjs(date).diff(dayjs(dayjs().format('YYYY-MM-DD'))) > 0
}

function showColumn(key: string): boolean {
    return columnTable.value.find(c => c.key === key);
}

// dirty hack waiting for https://github.com/nuxt/ui/issues/736
// function grayBgOfFutureInvoices() {
//     const rows = document.querySelectorAll('table tbody tr');
//
//     rows.forEach(row => {
//         const dateElement = row.querySelector('.issue-date');
//         if(dateElement) {
//             const isFuture = dayjs(dateElement.textContent).diff(dayjs(dayjs().format('YYYY-MM-DD'))) > 0;
//             if(isFuture) {
//                 row.classList.add('bg-violet-100')
//             }
//         }
//     })
// }
//
// onMounted(grayBgOfFutureInvoices)

</script>
