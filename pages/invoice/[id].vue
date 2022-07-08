<template>
  <SingleInvoice :id="route.params.id"/>
</template>

<script lang="ts" setup>
import {useRoute} from "#imports";

const route = useRoute()

console.log("route", route);

</script>

<style scoped>

</style>