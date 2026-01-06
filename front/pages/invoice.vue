<template>
  <div>
  <SingleInvoice :id="invoiceId"/>
  </div>
</template>

<script lang="ts" setup>
import {useRoute} from "#imports";

const route = useRoute()

const invoiceId = computed<string | undefined>(() => {
  if(!route.params.id) {
    return undefined;
  }

  return String(route.params.id);
});
</script>

<style scoped>

</style>
