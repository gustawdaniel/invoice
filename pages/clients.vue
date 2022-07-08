<template>
  <div>
    <p>Clients ({{ clients.length }}) |
      <nuxt-link to="/">Invoices</nuxt-link>
    </p>

    <ClientModal :openModal="isModalOpen" @close="toggleModal"/>

    <button class="border px-2 py-1 hover:bg-gray-100" @click="sync">SYNC</button>
    <button class="border px-2 py-1 hover:bg-gray-100" @click="toggleModal">NEW Client</button>

    <input type="text" placeholder="Search..." v-model="search">

    <table>
      <thead>
      <tr>
        <th>lp</th>
        <th>id</th>
        <th>name</th>
        <th>street</th>
        <th>post</th>
        <th>city</th>
        <th>tin</th>
        <th>actions</th>
      </tr>
      </thead>
      <tbody>
      <tr :key="client.id" v-for="(client, index) in clientsToShow">
        <td>{{ index + 1 }}</td>
        <td>{{ client.id }}</td>
        <td>{{ client.name }}</td>
        <td>{{ client.street }}</td>
        <td>{{ client.post }}</td>
        <td>{{ client.city }}</td>
        <td>{{ client.tin }}</td>
        <td>
          <button class="border px-2 py-1 hover:bg-gray-100" @click="edit(client)">EDIT</button>
          <button class="border px-2 py-1 hover:bg-gray-100" @click="remove(client.id)">DEL</button>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import axios, {AxiosResponse} from 'axios';

import {clients} from "~/store";
import {useRuntimeConfig} from "#app";
import {Client} from "~/interfaces/Client";
import {computed, ref} from "#imports";
import {useNuxtApp} from "#imports";
import {NewClientInput} from "#components";
const config = useRuntimeConfig()

const {$bus} = useNuxtApp()

const isModalOpen = ref<boolean>(false)
const search = ref<string>('')

function toggleModal() {
  console.log("toggle to", !isModalOpen.value);
  isModalOpen.value = !isModalOpen.value
}

const clientsToShow = computed(() => {
  return clients.value.filter(client => {
    return Object.values(client).join(' ').toLowerCase().includes(search.value.toLowerCase())
  })
})


function sync() {
  axios.get(config.JSON_URL + '/clients').then((res: AxiosResponse<Client[]>) => {
    clients.value = res.data
  })
}


function edit(client) {
  console.log("client", client);
  $bus.$emit('modal:open', {
    template: NewClientInput, data: client, params: {
      async onConfirm(res: Client) {
        console.log("res", res);

        try {
          await axios.put(config.public.JSON_URL + `/clients/` + res.id, res)
          sync()
          $bus.$emit('modal:close')
        } catch (e) {
          console.log(e);
          if (axios.isAxiosError(e)) {
            console.log("data", e.response.data);
          }
        }

      }
    }
  })
}

function remove(id) {
  const yes = confirm('Do you need to remove them?')
  if (yes) {
    axios.delete(config.JSON_URL + '/clients/' + id).then(sync)
  }
}
</script>

<style scoped>

</style>