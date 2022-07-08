<template>
  <div>
    <NuxtPage />
    <GlobalModal/>
  </div>
</template>

<script lang="ts" setup>
import './assets/css/tailwind.css'

import {useLocalStorage} from "~/composables/useLocalStorage";
import {clients, company, invoice, invoices} from "~/store";
import {useHead} from "#head";
import GlobalModal from "~/components/GlobalModal.vue";

useLocalStorage('company', company)
useLocalStorage('clients', clients)
useLocalStorage('invoice', invoice)
useLocalStorage('invoices', invoices)

useHead({
  htmlAttrs: {
    style: 'font-size: 13px'
  },
  titleTemplate: `invoice_${invoice.value.number}`,
})
</script>