<template>
  <div class="p-6 bg-white shadow-md rounded-xl">
    <!-- Header Buttons -->
    <div class="flex justify-between items-center mb-4 space-x-2">
        <button
            class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
            @click="sync"
        >
          <RefreshCw class="w-5 h-5" />
          Sync
        </button>

      <!-- Search Input -->
      <input
          type="text"
          placeholder="Search clients..."
          v-model="search"
          class=" w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-blue-200 focus:outline-none"
      />

      <button
          class="text-nowrap flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
          @click="openNewClientModal"
      >
        <Plus class="w-5 h-5" />
        New Client
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full border border-gray-200 rounded-lg shadow-md">
        <thead class="bg-gray-100">
        <tr class="text-left border-b border-gray-300 text-gray-600 text-sm">
          <th class="p-4">#</th>
          <th class="p-4">ID</th>
          <th class="p-4">Name</th>
          <th class="p-4">Street</th>
          <th class="p-4">Post</th>
          <th class="p-4">City</th>
          <th class="p-4">TIN</th>
          <th class="p-4 text-center">Actions</th>
        </tr>
        </thead>
        <tbody>
        <tr
            v-for="(client, index) in clientsToShow"
            :key="client.id"
            class="border-b border-gray-300 hover:bg-gray-50 transition"
        >
          <td class="p-4 text-gray-700">{{ index + 1 }}</td>
          <td class="p-4 text-gray-700">{{ client.id }}</td>
          <td class="p-4 font-medium text-gray-900">{{ client.name }}</td>
          <td class="p-4 text-gray-700">{{ client.street }}</td>
          <td class="p-4 text-gray-700">{{ client.post }}</td>
          <td class="p-4 text-gray-700">{{ client.city }}</td>
          <td class="p-4 text-gray-700">{{ client.tin }}</td>
          <td class="p-4 flex justify-center space-x-2">
            <button
                class="bg-yellow-500 text-white px-3 py-1 rounded-lg shadow hover:bg-yellow-600 flex items-center gap-2 transition"
                @click="openUpdateClientModal(client)"
            >
              <Pencil class="w-4 h-4" />
              Edit
            </button>
            <button
                class="bg-red-500 text-white px-3 py-1 rounded-lg shadow hover:bg-red-600 flex items-center gap-2 transition"
                @click="remove(client.id)"
            >
              <Trash2 class="w-4 h-4" />
              Delete
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


<script lang="ts" setup>
import type {Client} from "~/interfaces/Client";
import {useClientStore} from "~/store/client";
import NewClientInput from "~/components/NewClientInput.vue";
import { Pencil, Trash2, Plus, RefreshCw } from "lucide-vue-next";
const toast = useToast();

const modal = useModal()

const search = ref<string>('')
const clientStore = useClientStore();

const clientsToShow = computed(() => {
  return clientStore.clients.filter(client => {
    return Object.values(client).join(' ').toLowerCase().includes(search.value.toLowerCase())
  })
})

function sync() {
  clientStore.getClients()
}

function openUpdateClientModal(client: Client) {
  console.log("client", client);
  modal.open(NewClientInput, {
    title: 'Update client',
    initialValue: client})
}

function openNewClientModal() {
  modal.open(NewClientInput, {
    title: 'Add New client',
    initialValue: {
      city: '',
      name: '',
      post: '',
      tin: '',
      street: ''
    }})
}


async function remove(id: string) {
  const yes = confirm('Do you need to remove them?')
  if (yes) {
    await clientStore.deleteClient(id);
    await toast.add({ title: "Success", description: "Client was deleted successfully!" });
  }
}
</script>

<style scoped>

</style>
