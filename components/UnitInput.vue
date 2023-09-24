<template>
  <Listbox as="div" v-model="selected">
    <div class="relative">
      <ListboxButton
          class="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-3 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <span class="block truncate text-black">{{ selected.name }}</span>
        <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true"/>
        </span>
      </ListboxButton>

      <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100"
                  leave-to-class="opacity-0">
        <ListboxOptions
            class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 min-w-max overflow-auto focus:outline-none sm:text-sm">
          <ListboxOption as="template" v-for="unit in units" :key="unit.name" :value="unit"
                         v-slot="{ active, selected }">
            <li :class="[active ? 'text-white bg-indigo-600' : 'text-gray-900', 'cursor-default select-none relative py-2 pl-3']">
              <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                {{ unit.name }}
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from '@headlessui/vue'
import {ChevronUpDownIcon} from '@heroicons/vue/20/solid'
import {Unit} from "~/interfaces/Item";

const units: { name: Unit }[] = [
  'piece',
  'hour',
  'pack.',
  'box',
  'palette',
  't.',
  'kg',
  'm2',
  'm3',
  'km',
  'mb',
  'l',
  'mh.',
].map((unit:Unit):{name: Unit} => ({name: unit}));


const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const selected = computed({
  get () {
    return props.modelValue ? {name: props.modelValue} : units[1]
  },

  set (value: {name: Unit}) {
    return emit('update:modelValue', value.name)
  }
})
</script>
