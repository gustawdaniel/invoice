<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage/>
    </NuxtLayout>
  </UApp>
</template>

<script lang="ts" setup>
import {useHead} from "#imports";


useHead({
    htmlAttrs: {
        style: 'font-size: 13px',
    },
    titleTemplate: `invoice_${'invoice.value.number'}`, // TODO: make this dynamic
})
</script>
