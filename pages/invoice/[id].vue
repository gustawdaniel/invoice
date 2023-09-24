<template>
  <SingleInvoice :id="String(route.params.id)"/>
</template>

<script lang="ts" setup>
import {useRoute} from "#imports";

const route = useRoute()
</script>
