<template>
  <TransitionRoot as="template" :show="props.openModal">
    <Dialog as="div" class="relative z-10" @close="close">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                       leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"/>
      </TransitionChild>

      <div class="fixed z-10 inset-0 overflow-y-auto">
        <div class="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300"
                           enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                           enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                           leave-from="opacity-100 translate-y-0 sm:scale-100"
                           leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
                class="relative bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full sm:p-6">
              <div>

                <NewClientInput v-model="client"/>

              </div>
              <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button type="button"
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                        @click="save">Save
                </button>
                <button type="button"
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        @click="close" ref="cancelButtonRef">Cancel
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from '@headlessui/vue'
import {Client} from "~/interfaces/Client";
import {clients} from "~/store";
import axios from "axios";
import {useRuntimeConfig} from "#imports";
import {uid} from "uid";

const props = defineProps({
  openModal: {type: Boolean, default: true},
  client: {type: Object, default: null}
})

function isClient(obj: any): obj is Client {
  return obj && 'id' in obj && 'name' in obj && 'city' in obj && 'post' in obj && 'tin' in obj && 'street' in obj;
}

function defaultClientValue(): Client {
  return isClient(props.client) ? props.client : {
    id: uid(),
    name: '',
    city: '',
    post: '',
    tin: '',
    street: ''
  }
}

const client = ref<Client>(defaultClientValue())

const emit = defineEmits<{
  (e: 'close'): void
}>()

const config = useRuntimeConfig()

async function save() {
  console.log(client.value);
  clients.value.push(client.value)
  try {
    await axios.post(config.public.JSON_URL + `/clients`, client.value)
    client.value = defaultClientValue();
    close();
  } catch (e) {
    console.log(e);
    if (axios.isAxiosError(e)) {
      console.log("data", e.response.data);
    }
  }
}

function close() {
  emit('close')
}

</script>

<style scoped>

</style>