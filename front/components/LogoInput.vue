<template>
  <div>
    <div class="w-32 h-32 mb-1 border rounded-lg overflow-hidden relative bg-gray-100">
      <img id="image" class="object-cover w-full h-32" :src="htmlLogo" alt=""/>

      <div
          class="absolute top-0 left-0 right-0 bottom-0 w-full block cursor-pointer flex items-center justify-center"
          @click="openFileSelector">

        <button
            v-show="!company.logo"
            type="button"
            style="background-color: rgba(255, 255, 255, 0.65)"
            class="hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 text-sm border border-gray-300 rounded-lg shadow-sm"
        >
          <svg
              xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-camera" width="24" height="24"
              viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
              stroke-linejoin="round">
            <rect x="0" y="0" width="24" height="24" stroke="none"></rect>
            <path
                d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </button>
      </div>
    </div>
    <input name="photo" id="fileInput" accept="image/*" class="hidden" type="file"
           @change="setLogo">
  </div>
</template>

<script setup lang="ts">
import {computed} from "vue";
import {company} from "~/store";

const openFileSelector = () => {
  document.getElementById('fileInput').click()
}

const setLogo = (event) => {
  console.log("ok");
  const reader = new FileReader();
  reader.onload = (e) => {
    console.log(e.target.result);
    company.value.logo = e.target.result.toString();
  };
  reader.readAsDataURL(event.target.files[0]);
};

const htmlLogo = computed(() => {
  return company.value.logo || `https://placehold.co/300x300/e2e8f0/e2e8f0`;
})
</script>

<style scoped>

</style>