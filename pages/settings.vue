<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-base font-semibold leading-6 text-gray-900">Exchange Rates</h1>
        <p class="mt-2 text-sm text-gray-700">A list of all exchange rates saved in app state.</p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <button
            @click="syncRates"
            type="button"
            class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          Sync exchange rate
        </button>
      </div>
    </div>
    <div class="mt-8 flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table class="min-w-full divide-y divide-gray-300" v-if="settings.exchanges.length">
            <thead>
            <tr class="divide-x divide-gray-200">
              <th scope="col" class="py-3.5 pl-4 pr-4 text-left text-sm font-semibold text-gray-900 sm:pl-0">Base</th>
              <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
              <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">USD Rate</th>
              <th scope="col" class="py-3.5 pl-4 pr-4 text-left text-sm font-semibold text-gray-900 sm:pr-0">PLN Rate
              </th>
            </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
            <tr v-for="exchange in settings.exchanges" :key="exchange.date" class="divide-x divide-gray-200">
              <td class="whitespace-nowrap py-4 pl-4 pr-4 text-sm font-medium text-gray-900 sm:pl-0">{{
                  exchange.base
                }}
              </td>
              <td class="whitespace-nowrap p-4 text-sm text-gray-500">{{ exchange.date }}</td>
              <td class="whitespace-nowrap p-4 text-sm text-gray-500">{{ exchange.rates.USD }}</td>
              <td class="whitespace-nowrap py-4 pl-4 pr-4 text-sm text-gray-500 sm:pr-0">{{ exchange.rates.PLN }}</td>
            </tr>
            </tbody>
          </table>
          <div v-else>
            <p>No exchanges saved yet.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {settings} from "~/store";
import dayjs from "dayjs";
import axios from "axios";

interface ExchangeRateApiResponse {
    "success": boolean,
    "timestamp": string,
    "base": "EUR",
    "date": string,
    "rates": Record<'USD' | 'PLN' | 'GBP', number>
}

const config = useRuntimeConfig();

async function syncRates() {
    const today = dayjs().format('YYYY-MM-DD'),
        protocol = 'http',
        key = config.public.NUXT_PUBLIC_EXCHANGE_RATES_API_TOKEN;

    if (settings.value.exchanges.find(e => e.date === today)) return;
    const response = await axios.get<ExchangeRateApiResponse>(`${protocol}://api.exchangeratesapi.io/v1/latest?access_key=${key}&format=1&symbols=USD,PLN,GBP`);
    response.data

    settings.value.exchanges.push({
        rates: {...response.data.rates, EUR: 1},
        base: response.data.base,
        date: response.data.date
    })
}
</script>
