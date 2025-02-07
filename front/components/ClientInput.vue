<template>


  <div class="w-full md:w-2/5 mb-2 md:mb-0">
    <label class="text-gray-800 block mb-1 font-bold text-sm uppercase tracking-wide">Bill/Ship To:</label>

    <Combobox as="div" v-model="invoice.client" v-if="!invoice.client.name">
      <div class="relative mt-1">
        <ComboboxInput
            class="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            @change="query = $event.target.value" :display-value="(person) => person.name"/>
        <ComboboxButton class="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <ServerIcon class="h-5 w-5 text-gray-400" aria-hidden="true"/>
        </ComboboxButton>

        <ComboboxOptions v-if="filteredClients.length > 0"
                         class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          <ComboboxOption v-for="person in filteredClients" :key="person.id" :value="person" as="template"
                          v-slot="{ active, selected }">
            <li :class="['relative cursor-default select-none py-2 pl-3 pr-9', active ? 'bg-indigo-600 text-white' : 'text-gray-900']">
            <span :class="['block truncate', selected && 'font-semibold']">
              {{ person.name }}
            </span>

              <span v-if="selected"
                    :class="['absolute inset-y-0 right-0 flex items-center pr-4', active ? 'text-white' : 'text-indigo-600']">
              <CheckIcon class="h-5 w-5" aria-hidden="true"/>
            </span>
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </div>
    </Combobox>


    <template v-if="invoice.client.name">
      <input
          class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
          type="text" placeholder="Billing company name" v-model="invoice.client.name">
      <div class="flex">
        <input
            class="grow-0 mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/2 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
            type="text" placeholder="Billing company address" v-model="invoice.client.street">
        <input
            class="grow mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/6 py-2 px-2 mx-1 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
            type="text" placeholder="Additional info" v-model="invoice.client.post">
        <input
            class="grow-0 mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/3 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
            type="text" placeholder="Additional info" v-model="invoice.client.city">
      </div>
      <input
          class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
          type="text" placeholder="Additional info" v-model="invoice.client.tin">
    </template>

  </div>
</template>

<script setup lang="ts">
import {clients, invoice} from "~/store";
import {CheckIcon, ServerIcon} from '@heroicons/vue/20/solid'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/vue'

const query = ref('')
const filteredClients = computed(() =>
    query.value === ''
        ? clients.value
        : clients.value.filter((person) => {
          return person.name.toLowerCase().includes(query.value.toLowerCase())
        })
);
</script>

<style scoped>

</style>
