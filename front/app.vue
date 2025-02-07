<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage/>
    </NuxtLayout>
    <GlobalModal/>
  </UApp>
</template>

<script lang="ts" setup>
// import './assets/css/tailwind.css'

import {useLocalStorage} from "~/composables/useLocalStorage";
import {clients, invoice, invoices, settings} from "~/store";
import {useHead} from "#imports";
import GlobalModal from "~/components/GlobalModal.vue";

useLocalStorage('clients', clients)
useLocalStorage('invoice', invoice)
useLocalStorage('invoices', invoices)
useLocalStorage('settings', settings)

useHead({
    htmlAttrs: {
        style: 'font-size: 13px',
    },
    titleTemplate: `invoice_${invoice.value.number}`,
})
</script>
