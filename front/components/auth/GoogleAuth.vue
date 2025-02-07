<script lang="ts" setup>
import {isClient} from "@vueuse/shared";

const config = useRuntimeConfig()
import type {GoogleLoginCallbackPayload} from "~/interfaces/GoogleLoginCallbackPayload";
import {useUserStore} from "~/store/user";
import {getErrorMessage} from "~/helpers/getErrorMessage";
import {useExchangeStore} from "~/store/exchange";
import {useCompanyStore} from "~/store/company";

const router = useRouter();
const userStore = useUserStore()

const loading = ref(false)

useHead({
  script: [{
    async: true,
    src: 'https://accounts.google.com/gsi/client',
    defer: true
  }],
});

function signOut() {
  console.log('window,gapi', window.gapi);

  const auth2 = window.gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    console.log('User signed out.');
  });
}

function handleError(error: unknown) {
  loading.value = false;
  console.error(error);
  signOut();
  alert(getErrorMessage(error))
}

async function handleSignInWithGoogle(userData: GoogleLoginCallbackPayload) {
  console.log('r', userData);

  loading.value = true;

  userStore.verifyGoogleCredential(userData.credential)
      .then(async () => {
        await useExchangeStore().syncLatestExchangeRate();
        await useCompanyStore().getCompany();
        router.push('/');
      })
      .catch((error: unknown) => handleError(error))
}

if (isClient) {
  window.googleLoginCallback = handleSignInWithGoogle
}

</script>

<template>
  <div v-if="loading">
<!--    <div class="flex space-x-2 justify-center items-center">-->
<!--      <span class="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></span>-->
<!--      <span class="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.2s]"></span>-->
<!--      <span class="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.4s]"></span>-->
<!--      <span class="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.6s]"></span>-->
<!--      <span class="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.8s]"></span>-->
<!--    </div>-->

    <div class="flex space-x-2 justify-center items-center">
    <span v-for="i in 5" :key="i" class="w-3 h-3 bg-blue-500 rounded-full animate-bounce-fast"
          :style="`animation-delay: ${-0.09 * i}s`"></span>
    </div>
  </div>
  <div v-else>


    <div
        id="g_id_onload"
        :data-client_id="config.public.googleClientId"
        data-context="signin"
        data-ux_mode="popup"
        data-callback="googleLoginCallback"
        data-nonce=""
        data-auto_select="true"
        data-itp_support="true"
        data-use_fedcm_for_prompt="true"
    ></div>

    <div
        class="g_id_signin"
        data-type="standard"
        data-shape="pill"
        data-theme="outline"
        data-text="signin_with"
        data-size="large"
        data-logo_alignment="left"
    ></div>
  </div>
</template>

<style scoped>
@keyframes bounce-fast {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px); /* Higher bounce */
  }
}
.animate-bounce-fast {
  animation: bounce-fast 0.5s infinite ease-in-out; /* Faster speed */
}
</style>