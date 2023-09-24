<template>
  <div>
  <SingleInvoice :id="String(route.params.id)"/>
  </div>
</template>

<script lang="ts" setup>
import {useRoute} from "#imports";

const route = useRoute()
</script>

<style scoped>

</style>
