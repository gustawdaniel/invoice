<template>
  <div>

    <div class="mt-2">
      <div class="flex flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
        <h1 class="text-base font-semibold leading-7 text-gray-900">#INV</h1>
        <div
            class="order-last flex w-full gap-x-8 text-sm font-semibold leading-6 sm:order-none sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:leading-7">
          <nuxt-link to="/clients" :class="$route.name === 'clients' ? 'text-indigo-600' : 'text-gray-700'">
            Clients ({{ clients.length }})
          </nuxt-link>
          <nuxt-link to="/" :class="$route.name === 'index' ? 'text-indigo-600' : 'text-gray-700'">
            Invoices
          </nuxt-link>
          <nuxt-link to="/months" :class="$route.name === 'months' ? 'text-indigo-600' : 'text-gray-700'">
            Bookkeeping
          </nuxt-link>
          <nuxt-link to="/settings" :class="$route.name === 'settings' ? 'text-indigo-600' : 'text-gray-700'">
            Settings
          </nuxt-link>
        </div>
        <a @click="newInvoice"
           class="cursor-pointer ml-auto flex items-center gap-x-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          <PlusIcon class="-ml-1.5 h-5 w-5" aria-hidden="true"/>
          New invoice
        </a>
      </div>
    </div>

    <slot/>
  </div>
</template>

<script setup lang="ts">
import {PlusIcon} from '@heroicons/vue/20/solid'
const router = useRouter()
import {clients, invoice} from "~/store";
import {defaultInvoice} from "~/composables/useInvoice";
import {useRouter} from "#imports";

function newInvoice() {
    invoice.value = defaultInvoice()
    router.push(`/invoice`)
}
</script>
