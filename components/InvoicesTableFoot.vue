<template>
  <tfoot>
  <tr>
    <th :colspan="labelColspan"
        scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sum of {{invoices.length}} invoices
    </th>
    <th v-if="showValue" scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
      {{ totalValue }} {{currency}}
    </th>
  </tr>
  </tfoot>
</template>

<script setup lang="ts">
import {Currency, Invoice} from "#build/interfaces/Invoice";
import {exchange, paid} from "~/helpers/total";

const props = defineProps<{
    labelColspan: number
    showValue: boolean
    invoices: Array<Pick<Invoice, 'currency | paid'>>
    currency: Currency
}>();

const totalValue = computed<string>(() => {
    return (props.invoices.reduce((p: number, n: Pick<Invoice, 'currency | paid'>) => {
        return p + Math.round(100 * exchange(paid(n), n.currency, props.currency))
    }, 0) / 100).toLocaleString().replace(',', '.')
})
</script>

<style scoped>

</style>
