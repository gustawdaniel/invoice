<template>
  <td class="hidden py-4 text-sm text-gray-500 sm:table-cell">{{ index + 1 }}</td>

  <td class="py-4 pl-4 pr-3 text-sm sm:pl-6 md:pl-0">
    <input
        type="text"
        ref="inputName"
        class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        placeholder=""
        v-model="item.name"
    />

    <div class="mt-0.5 text-gray-500 sm:hidden">
      <input
          type="number"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          placeholder=""
          v-model="item.quantity"
      />
      hours at
      <input
          type="number"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          placeholder=""
          v-model="item.priceNet"
      />
    </div>
  </td>
  <td class="py-4 px-3  text-sm text-gray-500 sm:table-cell">
    <UnitInput v-model="item.unit"/>
  </td>
  <td class="hidden py-4 px-3 text-right text-sm text-gray-500 sm:table-cell">
    <input
        type="number"
        class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        placeholder=""
        v-model="item.quantity"
    />
  </td>
  <td class="hidden py-4 px-3 text-right text-sm text-gray-500 sm:table-cell">
    <div class="relative rounded-md shadow-sm">
      <input type="number" name="price" id="price"
             class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
             placeholder="0.00" aria-describedby="price-currency" v-model="item.priceNet"/>
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <span class="text-gray-500 sm:text-sm" id="price-currency"> {{ invoice.currency }} </span>
      </div>
    </div>
  </td>
  <td class="hidden py-4 px-3 text-sm text-gray-500 sm:table-cell">
    <VatInput v-model="item.vat"/>
  </td>
  <td class="py-4 pl-3 pr-3 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">{{ displayCurrency(priceNet) }}</td>
  <td class="py-4 pl-3 pr-3 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">{{ displayCurrency(priceGross) }}</td>
  <td class="py-4 pl-3 text-right text-sm text-gray-500 sm:pr-6 md:pr-0" @click="deleteItem(index)">x</td>

</template>

<script setup lang="ts">
import {computed, onMounted, ref, WritableComputedRef} from "vue";
import {Item} from "~/interfaces/Item";
import {displayCurrency} from '~/helpers/displayCurrency';
import {invoice} from "~/store";

const props = defineProps<{
  item: Item,
  index: number
}>()

const inputName = ref(null);

onMounted(() => {
  console.log("mounted", inputName);
  inputName.value.focus();
})

const emit = defineEmits(['deleteItem'])
const deleteItem = (index: number) => emit('deleteItem', index);
const priceNet = computed<number>(() => props.item.priceNet * props.item.quantity);
const priceGross = computed<number>(() => priceNet.value * (1 + props.item.vat.value));

</script>
