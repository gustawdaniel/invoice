<template>


  <div class="w-full mb-2 md:mb-0" v-if="props.modelValue">

    <input
        class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
        type="text" placeholder="Billing company name" :value="props.modelValue.name" @change="(event) => updateValue({name: event.target.value})">
    <div class="flex">
      <input
          class="grow-0 mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/2 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
          type="text" placeholder="Billing company address" :value="props.modelValue.street" @change="event => updateValue({street: event.target.value})">
      <input
          class="grow mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/6 py-2 px-2 mx-1 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
          type="text" placeholder="Additional info" :value="props.modelValue.post" @change="event => updateValue({post: event.target.value})">
      <input
          class="grow-0 mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/3 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
          type="text" placeholder="Additional info" :value="props.modelValue.city" @change="event => updateValue({city: event.target.value})">
    </div>
    <input
        class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
        type="text" placeholder="Additional info" :value="props.modelValue.tin" @change="event => updateValue({tin: event.target.value})">

  </div>
</template>

<script setup lang="ts">
import {Client} from "~/interfaces/Client";
import {uid} from "uid";

const props = defineProps({
  modelValue: {
    type: Object,
    required: false,
    default: ():Client => ({
      id: uid(),
      city: '',
      name: '',
      post: '',
      tin: '',
      street: ''
    })
  }
})

const emit = defineEmits(['update:modelValue'])

function updateValue(value: { [key in keyof Client]: string }) {
  emit('update:modelValue', {...props.modelValue, ...value})
}
</script>

<style scoped>

</style>