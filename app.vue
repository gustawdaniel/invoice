<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script lang="ts" setup>
import './assets/css/tailwind.css'

import {useLocalStorage} from "~/composables/useLocalStorage";
import {clients, company, invoice} from "~/store";
import {useHead} from "#head";

useLocalStorage('company', company)
useLocalStorage('clients', clients)
useLocalStorage('invoice', invoice)

useHead({
  htmlAttrs: {
    style: 'font-size: 13px'
  },
  titleTemplate: `invoice_${invoice.value.number}`,
})
</script>