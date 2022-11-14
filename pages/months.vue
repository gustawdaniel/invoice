<template>
  <div>
    <p>
      <nuxt-link to="/">Invoices list</nuxt-link>
      |
      <nuxt-link to="/clients">Clients</nuxt-link>
      |
      <nuxt-link to="/months">Bookkeeping</nuxt-link>
    </p>

    <table class="min-w-full divide-y divide-gray-300">
      <template :key="month.month" v-for="month in invoicesPaidByMonths.filter(i => i.invoices.length)">
        <thead class="bg-gray-50">
        <tr>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{{ month.month }} ({{month.month_number}})</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">issued at</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">paid at</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">client</th>
          <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">value</th>
          <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
            <span class="sr-only">Edit</span>
          </th>
        </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
        <tr :key="invoice.id" v-for="(invoice) in month.invoices">
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.number }}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.issueDate }}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.paymentDate }}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ invoice.client.name }}</td>
          <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ total(invoice) }}
            {{ invoice.currency.toUpperCase() }}
          </td>
        </tr>
        </tbody>
      </template>
    </table>

  </div>
</template>

<script lang="ts" setup>
import {computed} from "#imports";
import {Invoice} from "~/interfaces/Invoice";
import {invoices} from "~/store";
import dayjs from "dayjs";
import {total} from '~/helpers/total'

function invoicesAgo(monthsAgo): Invoice[] {
  const datePrefix = dayjs().subtract(monthsAgo, 'month').format('YYYY-MM');
  return invoices.value.filter(inv => inv.paymentDate && inv.paymentDate.startsWith(datePrefix));
}

const monthsAgo = 7;

console.log("all", [...new Array(monthsAgo)].map((e, i, a) => invoicesAgo(a.length - 1 - i)));

const invoicesPaidByMonths = computed<{ month: string, invoices: Invoice[] }[]>(() => {
      return [...new Array(monthsAgo)].map((e, i, a) => {
        const ago = a.length - 1 - i;
        return {
          month: dayjs().subtract(ago, 'month').format('MMMM'),
          month_number: dayjs().subtract(ago, 'month').format('MM'),
          invoices: invoicesAgo(ago)
        }
      })
    }
)

</script>
