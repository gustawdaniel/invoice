<script lang="ts" setup>
import {useCompanyStore, type Country} from "~/store/company";
import {useCompanySwitch} from "~/composables/useCompanySwitch";

const companyStore = useCompanyStore();
const {switchCompany, createCompany} = useCompanySwitch();
const toast = useToast();
const router = useRouter();

const adding = ref(false);
const newName = ref('');
const newCountry = ref<Country>('PL');

onMounted(async () => {
  await companyStore.getCompanies();
  await companyStore.getCompany();
});

async function onSelect(event: Event) {
  await switchCompany((event.target as HTMLSelectElement).value);
  await router.push('/');
}

async function add() {
  if (!newName.value.trim()) return;
  try {
    await createCompany(newName.value.trim(), newCountry.value);
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

    <button v-if="!adding"
            class="rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100 cursor-pointer"
            title="Add another company (e.g. a Polish one with KSeF)"
            @click="adding = true">+ New company</button>
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
