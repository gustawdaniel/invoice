<template>
  <UModal  :title="title">

    <template #body>
      <div class="w-full mb-2 md:mb-0">
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
            type="text" placeholder="Tax ID Number" v-model="client.tin">
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
const toast = useToast();

const props = defineProps<{
  title: string,
  initialValue: Client,
}>()

const modal = useModal();
const client = ref<Client>(props.initialValue)

watch(() => props.initialValue, (value) => {
  console.log('watch', value);
  client.value = value;
})

const clientStore = useClientStore();

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