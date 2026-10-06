<script lang="ts" setup>
import {useCompanyStore, type Country} from "~/store/company";
import {useClientStore} from "~/store/client";
import {useInvoiceStore} from "~/store/invoice";

const companyStore = useCompanyStore();
const clientStore = useClientStore();
const invoiceStore = useInvoiceStore();
const toast = useToast();
const router = useRouter();

const adding = ref(false);
const newName = ref('');
const newCountry = ref<Country>('PL');

onMounted(async () => {
  await companyStore.getCompanies();
  await companyStore.getCompany();
});

async function reloadCompanyData() {
  invoiceStore.invoice = null;
  invoiceStore.invoices = [];
  clientStore.clients = [];
  await Promise.all([clientStore.getClients(), invoiceStore.getInvoices()]);
}

async function onSelect(event: Event) {
  await companyStore.selectCompany((event.target as HTMLSelectElement).value);
  await reloadCompanyData();
  await router.push('/');
}

async function add() {
  if (!newName.value.trim()) return;
  try {
    await companyStore.addCompany({name: newName.value.trim(), country: newCountry.value});
    await reloadCompanyData();
    adding.value = false;
    newName.value = '';
    await router.push('/company');
  } catch (e) {
    toast.add({title: 'Error', description: (e as Error).message, color: 'error'});
  }
}
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <select
        class="rounded-md border-gray-300 py-1 text-sm"
        :value="companyStore.company.id"
        @change="onSelect">
      <option v-for="c in companyStore.companies" :key="c.id" :value="c.id">
        {{ c.name }} ({{ c.country }})
      </option>
    </select>
    <span v-if="companyStore.usesKsef"
          :class="companyStore.company.ksefEnv === 'prod' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
          class="rounded px-2 py-0.5 text-xs font-semibold"
          :title="companyStore.company.ksefConnected ? 'KSeF connected' : 'KSeF not connected'">
      {{ companyStore.company.ksefEnv === 'prod' ? 'KSeF' : 'KSeF TEST' }}{{ companyStore.company.ksefConnected ? '' : ' ⚠' }}
    </span>

    <button v-if="!adding" class="text-gray-500 hover:text-gray-900" title="Add company" @click="adding = true">+</button>
    <form v-else class="flex items-center gap-1" @submit.prevent="add">
      <input v-model="newName" placeholder="Company name" class="rounded-md border-gray-300 py-1 text-sm" autofocus>
      <select v-model="newCountry" class="rounded-md border-gray-300 py-1 text-sm">
        <option value="PL">PL</option>
        <option value="GE">GE</option>
      </select>
      <button type="submit" class="rounded bg-indigo-600 px-2 py-1 text-white">Add</button>
      <button type="button" class="text-gray-500" @click="adding = false">✕</button>
    </form>
  </div>
</template>
