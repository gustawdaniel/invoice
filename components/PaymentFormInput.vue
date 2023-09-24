<template>
  <Listbox as="div" v-model="selected">
    <div class="relative">
      <ListboxButton
          class="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-3 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <span class="block truncate text-black">{{ selected.name }}</span>
        <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true"/>
        </span>
      </ListboxButton>

      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100"
                  leave-to-class="opacity-0">
        <ListboxOptions
            class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 min-w-max overflow-auto focus:outline-none sm:text-sm">
          <ListboxOption as="template" v-for="form in forms" :key="form.name" :value="form"
                         v-slot="{ active, selected }">
            <li :class="[active ? 'text-white bg-indigo-600' : 'text-gray-900', 'cursor-default select-none relative py-2 pl-3']">
              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                {{ form.name }}
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from '@headlessui/vue'
import {ChevronDownIcon} from '@heroicons/vue/20/solid'
import {PaymentForm} from "~/interfaces/Invoice";
import {invoice} from "~/store";
import dayjs from "dayjs";
import {deadlineDate} from "~/helpers/deadlineDate";

const forms: PaymentForm[] = [
  {name: "Cash", key: 'cash'},
  {name: "Transfer (prepaid)", key: 'prepaid'},
  {name: "Transfer 14 days", key: '14d'},
  {name: "Transfer 7 days", key: '7d'},
  {name: "Payment card", key: 'card'},
  {name: "Cash on delivery", key: 'delivery'},
  {name: "Check", key: 'check'},
  {name: "DotPay", key: 'dotpay'},
  {name: "PayPal", key: 'paypal'},
  {name: "PayU", key: 'payu'},
  {name: "Other", key: 'other'},
];

const props = defineProps({
  modelValue: {
    type: Object
  }
})

const emit = defineEmits(['update:modelValue'])

const selected = computed({
  get() {
    return props.modelValue ? props.modelValue : forms[2]
  },

  set(value: PaymentForm) {
    if (['7d', '14d', 'cash'].includes(value.key)) {
      invoice.value.deadlineDate = deadlineDate(invoice.value.issueDate, value.key);
    }

    return emit('update:modelValue', value)
  }
})
</script>
