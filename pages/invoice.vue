<template>
  <div>
    <p>
      <nuxt-link to="/">Invoices list</nuxt-link> |
      <nuxt-link to="/clients">Clients</nuxt-link> |
      <nuxt-link to="/months">Bookkeeping</nuxt-link>
    </p>
  <SingleInvoice :id="route.params.id"/>
  </div>
</template>

<script lang="ts" setup>
import {useRoute} from "#imports";

console.log("xd")

const route = useRoute()

console.log("route", route.params.id);
</script>

<style scoped>

</style>
