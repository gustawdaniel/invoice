<template>
  <Listbox as="div" v-model="selected">
    <div class="relative">
      <ListboxButton
          class="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-3 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <span class="block truncate text-black">{{ selected.name }}</span>
        <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ServerIcon class="h-5 w-5 text-gray-400" aria-hidden="true"/>
        </span>
      </ListboxButton>

      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100"
                  leave-to-class="opacity-0">
        <ListboxOptions
            class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 min-w-max overflow-auto focus:outline-none sm:text-sm">
          <ListboxOption as="template" v-for="vat in vats as any[]" :key="vat.name" :value="vat"
                         v-slot="{ active, selected }">
            <li :class="[active ? 'text-white bg-indigo-600' : 'text-gray-900', 'cursor-default select-none relative py-2 pl-3']">
              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                {{ vat.name }}
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
import {ServerIcon} from '@heroicons/vue/20/solid'
import {Vat} from "~/interfaces/Item";

const vats: Vat[] = [
  {name: "23%", value: 0.23},
  {name: "19%", value: 0.19},
  {name: "18%", value: 0.18},
  {name: "8%", value: 0.08},
  {name: "5%", value: 0.05},
  {name: "0%", value: 0},
  {name: "zw.", value: 0},
  {name: "exempt.", value: 0},
  {name: "np.", value: 0},
  {name: "np. EU", value: 0},
  {name: "0% WDT", value: 0},
  {name: "0% Exp.", value: 0},
  {name: "o.o.", value: 0},
];

const props = defineProps({
  modelValue: {
    type: Object
  }
})

const emit = defineEmits(['update:modelValue'])

const selected = computed({
  get(): Vat {
    return props.modelValue ? props.modelValue as Vat : vats[5]
  },

  set(value: Vat) {
    return emit('update:modelValue', value)
  }
})
</script>
