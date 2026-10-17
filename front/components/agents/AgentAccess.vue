<script lang="ts" setup>
import {useAgentKeysStore} from "~/store/agentKeys";

const store = useAgentKeysStore();
const toast = useToast();
const name = ref('');
const newKey = ref<string | null>(null);
const busy = ref(false);
const mcpUrl = `${import.meta.env.VITE_API_URL}/mcp`;

const claudeCommand = computed(() =>
    `claude mcp add --transport http openinvoice ${mcpUrl} --header "Authorization: Bearer ${newKey.value ?? 'oi_...'}"`);

onMounted(() => store.getKeys().catch(e => toast.add({title: 'Error', description: (e as Error).message, color: 'error'})));

async function create() {
  if (!name.value.trim()) return;
  busy.value = true;
  try {
    newKey.value = await store.createKey(name.value.trim());
    name.value = '';
  } catch (e) {
    toast.add({title: 'Error', description: (e as Error).message, color: 'error'});
  } finally {
    busy.value = false;
  }
}

async function remove(id: string) {
  if (!confirm('Revoke this key? Agents using it lose access immediately.')) return;
  try {
    await store.deleteKey(id);
  } catch (e) {
    toast.add({title: 'Error', description: (e as Error).message, color: 'error'});
  }
}

const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.add({title: 'Copied'}));
const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'never';
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-base font-semibold text-gray-900">Agent access (MCP)</h2>
      <p class="mt-1 text-sm text-gray-700">
        AI agents with a key can create companies, clients and invoice drafts for you through the MCP server
        <code class="rounded bg-gray-100 px-1">{{ mcpUrl }}</code>.
        They cannot send anything to production KSeF: they can only ask, and you approve each request on the invoice list.
      </p>
    </div>

    <form class="flex flex-wrap items-center gap-3" @submit.prevent="create">
      <input v-model="name" type="text" maxlength="60" placeholder="Key name, e.g. Claude on laptop"
             class="min-w-0 flex-1 rounded-md border-gray-300 text-sm" />
      <button type="submit" class="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50" :disabled="busy || !name.trim()">
        Create key
      </button>
    </form>

    <div v-if="newKey" class="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
      <p class="font-medium">Copy the key now, it is not shown again.</p>
      <div class="flex items-center gap-2">
        <code class="min-w-0 flex-1 break-all rounded bg-white px-2 py-1">{{ newKey }}</code>
        <button class="border px-2 py-1 hover:bg-gray-100" @click="copy(newKey)">Copy</button>
      </div>
      <p>Add it to Claude Code:</p>
      <div class="flex items-center gap-2">
        <code class="min-w-0 flex-1 break-all rounded bg-white px-2 py-1">{{ claudeCommand }}</code>
        <button class="border px-2 py-1 hover:bg-gray-100" @click="copy(claudeCommand)">Copy</button>
      </div>
      <button class="text-xs text-gray-600 underline" @click="newKey = null">Done, hide it</button>
    </div>

    <table v-if="store.keys.length" class="min-w-full divide-y divide-gray-200 text-sm">
      <thead>
      <tr class="text-left text-gray-900">
        <th class="py-2 pr-3 font-semibold">Name</th>
        <th class="px-3 py-2 font-semibold">Key</th>
        <th class="px-3 py-2 font-semibold">Last used</th>
        <th class="py-2 pl-3"></th>
      </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 text-gray-600">
      <tr v-for="key in store.keys" :key="key.id">
        <td class="py-2 pr-3 text-gray-900">{{ key.name }}</td>
        <td class="px-3 py-2"><code>{{ key.prefix }}…</code></td>
        <td class="px-3 py-2">{{ date(key.lastUsedAt) }}</td>
        <td class="py-2 pl-3 text-right">
          <button class="border px-2 py-1 hover:bg-gray-100" @click="remove(key.id)">Revoke</button>
        </td>
      </tr>
      </tbody>
    </table>
    <p v-else class="text-sm text-gray-500">No keys yet.</p>
  </section>
</template>
