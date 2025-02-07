<script lang="ts" setup>

import logo from "assets/images/logo.png";
import GoogleAuth from "~/components/auth/GoogleAuth.vue";
import {useUserStore} from "~/store/user";

const userStore = useUserStore()

onMounted(() => {
  if(userStore.user) {
    const router = useRouter();
    router.push('/')
  }
})
</script>

<template>
  <div class="flex justify-center items-center w-screen h-screen

 bg-gradient-to-br from-blue-50 via-purple-100 to-indigo-200
">
    <div class="elevation-24 rounded-lg shadow-xl justify-center p-10 bg-white">
      <img :src="logo" alt="Logo" class="h-24 w-auto m-auto mb-5">
      <h1 class="text-xl text-center mb-5">Invoices</h1>
      <GoogleAuth/>
    </div>
  </div>
</template>

<style scoped>

</style>