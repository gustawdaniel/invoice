<template>
  <UModal  :title="title" :description="title">

    <template #body>
      <div class="w-full mb-2 md:mb-0">
        <div class="flex gap-1 mb-1">
          <input
              class="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              type="text" placeholder="Tax ID Number (NIP)" v-model="client.tin">
          <button type="button" :disabled="lookingUp"
                  class="whitespace-nowrap rounded border border-gray-300 px-3 text-sm hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                  title="Fill name and address of a Polish company from the MF White List"
                  @click="fillFromMf">{{ lookingUp ? 'Loading...' : 'Fill from MF' }}</button>
        </div>
        <input
            class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
            type="text" placeholder="Company name" v-model="client.name">
        <div class="flex">
          <input
              class="grow-0 mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/2 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              type="text" placeholder="Address" v-model="client.street">
          <input
              class="grow mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/6 py-2 px-2 mx-1 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              type="text" placeholder="Post" v-model="client.post">
          <input
              class="grow-0 mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-1/3 py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              type="text" placeholder="City" v-model="client.city">
        </div>
        <input
            class="mb-1 bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
            type="text" placeholder="Country (e.g. Poland, Georgia)" v-model="client.country">
      </div>
    </template>

    <template #footer>
      <div class="sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
        <button type="button"
                class="cursor-pointer w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                @click="onConfirm">Save
        </button>
        <button type="button"
                class="cursor-pointer mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                @click="closeModal" ref="cancelButtonRef">Cancel
        </button>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type {Client} from "~/interfaces/Client";
import {useClientStore} from "~/store/client";
import {lookupNip} from "~/helpers/lookupNip";
const toast = useToast();
const lookingUp = ref(false);

const props = defineProps<{
  title: string,
  initialValue: Client,
}>()

const modal = useModal();
const client = ref<Client>(props.initialValue)

watch(() => props.initialValue, (value) => {
  client.value = value;
})

const clientStore = useClientStore();

async function fillFromMf() {
  lookingUp.value = true;
  try {
    const data = await lookupNip(client.value.tin ?? '');
    client.value = {
      ...client.value,
      tin: data.nip,
      name: data.name,
      street: data.street,
      post: data.post,
      city: data.city,
      country: 'Poland',
    };
  } catch (e) {
    toast.add({title: "MF lookup failed", description: (e as Error).message, color: 'error'});
  } finally {
    lookingUp.value = false;
  }
}

async function onConfirm() {
  const isNew = !props.initialValue.id;

  if(isNew) {
    await clientStore.addClient(client.value);
    await toast.add({ title: "Success", description: "Client was added!" });
  } else {
    await clientStore.updateClient(client.value);
    await toast.add({ title: "Success", description: "Client was updated!" });
  }

  return modal.close()
}

function closeModal() {
  modal.close()
}
</script>

<style scoped>

</style>