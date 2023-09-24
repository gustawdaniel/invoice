<template>

  <div class="-mx-4 mt-8 flex flex-col sm:-mx-6 md:mx-0">
    <table class="min-w-full divide-y divide-gray-300">
      <thead>
      <tr>
        <th scope="col" class="py-3.5 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0">Nr.</th>
        <th scope="col" class="py-3.5 pl-4 pr-3  text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0">
          Good or service
        </th>
        <th scope="col" class="hidden py-3.5 px-3 text-sm font-semibold text-gray-900 sm:table-cell">
          Unit
        </th>
        <th scope="col" class="hidden py-3.5 px-3 text-sm font-semibold text-gray-900 sm:table-cell">
          Amount
        </th>
        <th scope="col" class="hidden py-3.5 px-3 text-sm font-semibold text-gray-900 sm:table-cell">
          Price Netto
        </th>
        <th scope="col" class="py-3.5 pl-3 pr-4 text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0">
          Vat Rate
        </th>
        <th scope="col" class="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0">
          Price Net
        </th>
        <th scope="col" class="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0">
          Price Gross
        </th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(_, index) in invoice.items" :key="index" class="border-b border-gray-200">
        <SingleItemInput v-model:item="invoice.items[index]" :index="index" @deleteItem="deleteItem"/>
      </tr>
      </tbody>
      <tfoot>
      <tr>
        <th></th>
        <th class="text-left">
          <button
              class="mt-6 bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 text-sm border border-gray-300 rounded shadow-sm"
              @click="addItem">
            Add Invoice Items
          </button>
        </th>
        <th scope="row" colspan="5"
            class="hidden pl-6 pr-3 pt-6 text-right text-sm font-normal text-gray-500 sm:table-cell md:pl-0">Subtotal
        </th>
        <th scope="row" class="pl-4 pr-3 pt-6 text-left text-sm font-normal text-gray-500 sm:hidden">Subtotal</th>
        <td class="pl-3 pr-4 pt-6 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">{{ displayCurrency(subTotal) }}</td>
      </tr>
      <tr>
        <th scope="row" colspan="7"
            class="hidden pl-6 pr-3 pt-4 text-right text-sm font-normal text-gray-500 sm:table-cell md:pl-0">Tax
        </th>
        <th scope="row" class="pl-4 pr-3 pt-4 text-left text-sm font-normal text-gray-500 sm:hidden">Tax</th>
        <td class="pl-3 pr-4 pt-4 text-right text-sm text-gray-500 sm:pr-6 md:pr-0">{{ displayCurrency(tax) }}</td>
      </tr>
      <tr>
        <th scope="row" colspan="7"
            class="hidden pl-6 pr-3 pt-4 text-right text-sm font-semibold text-gray-900 sm:table-cell md:pl-0">Total
        </th>
        <th scope="row" class="pl-4 pr-3 pt-4 text-left text-sm font-semibold text-gray-900 sm:hidden">Total</th>
        <td class="pl-3 pr-4 pt-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0">
          {{ displayCurrency(total) }}
        </td>
      </tr>
      <tr>
        <th scope="row" colspan="7"
            class="hidden pl-6 pr-3 pt-4 text-right text-sm font-semibold text-gray-900 sm:table-cell md:pl-0">Paid
        </th>
        <th scope="row" class="pl-4 pr-3 pt-4 text-left text-sm font-semibold text-gray-900 sm:hidden">Paid</th>
        <td class="pl-3 pr-4 pt-4 text-right text-sm font-semibold text-gray-900 sm:pr-6 md:pr-0">
          <div class="relative rounded-md shadow-sm">
            <input type="number" name="price" id="price"
                   class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                   placeholder="0.00" aria-describedby="price-currency" v-model="invoice.paid"/>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm" id="price-currency"> {{ invoice.currency }} </span>
            </div>
          </div>
        </td>



      </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import {invoice, subTotal, tax, total} from "~/store";
import {displayCurrency} from "~/helpers/displayCurrency";

const addItem = () => {
  const prevItem = invoice.value.items.length ? invoice.value.items[invoice.value.items.length - 1] : null;

  invoice.value.items.push({
    name: '',
    unit: prevItem?.unit ?? 'hour',
    vat: prevItem?.vat ?? {
      name: 'zw.',
      value: 0,
    },
    quantity: 1,
    priceNet: prevItem?.priceNet ?? 100
  });
}

const deleteItem = (index) => {
  invoice.value.items.splice(index, 1);
}

</script>

<style scoped>

</style>
