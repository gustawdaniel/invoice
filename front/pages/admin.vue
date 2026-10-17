<script lang="ts" setup>
import {authHeaders} from "~/helpers/authHeaders";
import {apiErrorMessage} from "~/helpers/apiErrorMessage";

interface AdminCompany {
  id: string;
  name: string;
  country: 'PL' | 'GE';
  tin: string;
  ksefEnv: 'test' | 'prod' | null;
  ksefConnected: boolean;
  createdAt: string;
  users: { email: string; lastVerifiedAt: string | null }[];
  invoices: number;
  pendingKsefRequests: number;
}

const companies = ref<AdminCompany[]>([]);
const error = ref('');
const filter = ref('');

onMounted(async () => {
  try {
    companies.value = await $fetch<AdminCompany[]>(`${import.meta.env.VITE_API_URL}/admin/companies`, {headers: authHeaders()});
  } catch (e) {
    error.value = apiErrorMessage(e);
  }
});

const shown = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return companies.value;
  return companies.value.filter(c => [c.name, c.tin, ...c.users.map(u => u.email)].some(v => v.toLowerCase().includes(q)));
});
const users = computed(() => new Set(companies.value.flatMap(c => c.users.map(u => u.email))).size);
const date = (value: string | null) => value ? new Date(value).toLocaleDateString() : '—';
</script>

<template>
  <div class="mx-auto max-w-6xl bg-white p-6">
    <div class="sm:flex sm:items-end sm:justify-between">
      <div>
        <h1 class="text-base font-semibold text-gray-900">All companies</h1>
        <p class="mt-1 text-sm text-gray-700">{{ companies.length }} companies, {{ users }} users.</p>
      </div>
      <input v-model="filter" type="search" placeholder="Filter by name, NIP or email"
             class="mt-3 w-full rounded-md border-gray-300 text-sm sm:mt-0 sm:w-72" />
    </div>

    <p v-if="error" class="mt-6 text-sm text-red-600">{{ error }}. Admin access comes from ADMIN_EMAILS; sign out and in again after it changes.</p>

    <div v-else class="mt-6 overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-300 text-sm">
        <thead>
        <tr class="text-left text-gray-900">
          <th class="py-2 pr-3 font-semibold">Company</th>
          <th class="px-3 py-2 font-semibold">NIP / TIN</th>
          <th class="px-3 py-2 font-semibold">KSeF</th>
          <th class="px-3 py-2 font-semibold">Users</th>
          <th class="px-3 py-2 text-right font-semibold">Invoices</th>
          <th class="py-2 pl-3 font-semibold">Created</th>
        </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 text-gray-600">
        <tr v-for="company in shown" :key="company.id">
          <td class="py-2 pr-3">
            <span class="text-gray-900">{{ company.name }}</span>
            <span class="ml-1 text-xs text-gray-400">{{ company.country }}</span>
          </td>
          <td class="px-3 py-2">{{ company.tin || '—' }}</td>
          <td class="px-3 py-2 whitespace-nowrap">
            <template v-if="company.ksefEnv">
              {{ company.ksefEnv === 'prod' ? 'production' : 'test' }}
              <span :class="company.ksefConnected ? 'text-green-700' : 'text-amber-700'">
                {{ company.ksefConnected ? 'connected' : 'not connected' }}
              </span>
            </template>
            <template v-else>off</template>
            <span v-if="company.pendingKsefRequests" class="ml-1 text-xs font-medium text-amber-700">
              {{ company.pendingKsefRequests }} waiting for approval
            </span>
          </td>
          <td class="px-3 py-2">
            <div v-for="user in company.users" :key="user.email" :title="`last login ${date(user.lastVerifiedAt)}`">{{ user.email }}</div>
          </td>
          <td class="px-3 py-2 text-right">{{ company.invoices }}</td>
          <td class="py-2 pl-3 whitespace-nowrap">{{ date(company.createdAt) }}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
