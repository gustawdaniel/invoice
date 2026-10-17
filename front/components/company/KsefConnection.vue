<script setup lang="ts">
import { useCompanyStore, type KsefEnv } from "~/store/company";

// One KSeF connection of the selected company: production (live mode) or DEMO (test mode), each with its own token
const props = defineProps<{ env: KsefEnv }>();

const companyStore = useCompanyStore();
const toast = useToast();
const busy = ref(false);
const signedFile = ref<File | null>(null);
const pastedToken = ref('');

const isProd = computed(() => props.env === 'prod');
const connected = computed(() => isProd.value ? companyStore.company.ksefConnected : companyStore.company.ksefDemoConnected);
const portal = computed(() => isProd.value
    ? 'https://ap.ksef.mf.gov.pl/web/tokens/generate-token'
    : 'https://ap-demo.ksef.mf.gov.pl');

async function run(action: () => Promise<void>, success: string) {
  busy.value = true;
  try {
    await action();
    toast.add({ title: "KSeF", description: success });
  } catch (e) {
    toast.add({ title: "KSeF error", description: (e as Error).message, color: 'error' });
  } finally {
    busy.value = false;
  }
}

const downloadAuthRequest = () => run(async () => {
  const xml = await companyStore.getKsefAuthRequest(props.env);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
  link.download = `ksef-${props.env}-auth-request.xml`;
  link.click();
  URL.revokeObjectURL(link.href);
}, 'Sign the downloaded file within 10 minutes and upload it below.');

const uploadSigned = () => run(async () => {
  if (!signedFile.value) throw new Error('Choose the signed XML file first');
  await companyStore.sendKsefSignedRequest(props.env, await signedFile.value.text());
  signedFile.value = null;
}, `Connected to KSeF ${isProd.value ? 'production' : 'DEMO'}.`);

const connectWithToken = () => run(async () => {
  await companyStore.connectKsefWithToken(props.env, pastedToken.value);
  pastedToken.value = '';
}, 'KSeF token verified and stored.');

const disconnect = () => {
  if (!confirm(`Remove the stored KSeF ${isProd.value ? 'production' : 'DEMO'} token from this company?`)) return;
  return run(() => companyStore.disconnectKsef(props.env), 'KSeF token removed.');
};
</script>

<template>
  <section class="space-y-3 rounded-md border p-4" :class="isProd ? 'border-gray-200' : 'border-orange-200 bg-orange-50/40'">
    <h3 class="font-semibold">
      {{ isProd ? 'KSeF production' : 'KSeF DEMO' }}
      <span class="text-sm font-normal text-gray-500">{{ isProd ? '— live mode, legally binding' : '— test mode, no legal effect' }}</span>:
      <span :class="connected ? 'text-green-700' : 'text-amber-700'">{{ connected ? 'connected' : 'not connected' }}</span>
    </h3>

    <p v-if="!isProd" class="text-sm text-gray-600">
      DEMO is the pre-production KSeF of the Ministry of Finance: your real NIP and data, invoices without legal effect,
      nobody is notified. Turn on <b>Test mode</b> in the header to issue and send test invoices.
    </p>

    <button v-if="connected" class="border rounded px-3 py-1 hover:bg-gray-100" :disabled="busy" @click="disconnect">
      Disconnect
    </button>

    <template v-else>
      <div class="space-y-2">
        <p class="text-sm text-gray-700">
          Paste a token generated in
          <a class="text-indigo-600 underline" :href="portal" target="_blank">Aplikacja Podatnika KSeF{{ isProd ? '' : ' (DEMO)' }}</a>
          with invoice read and write permissions{{ isProd ? '' : ' (a production token does not work here)' }}.
        </p>
        <form class="flex flex-wrap items-center gap-3" @submit.prevent="connectWithToken">
          <input v-model="pastedToken" type="password" autocomplete="off" placeholder="reference|nip-...|..."
                 class="min-w-0 flex-1 rounded-md border-gray-300 text-sm" />
          <button type="submit" class="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50" :disabled="busy || !pastedToken.trim()">
            {{ busy ? 'Checking...' : 'Use token' }}
          </button>
        </form>
      </div>

      <details class="text-sm text-gray-700">
        <summary class="cursor-pointer">Or connect with Profil Zaufany / qualified signature</summary>
        <ol class="mt-2 list-decimal pl-5 space-y-1">
          <li>Download the authorization request (valid for 10 minutes).</li>
          <li>Sign it with Profil Zaufany on
            <a class="text-indigo-600 underline" href="https://www.gov.pl/web/gov/podpisz-dokument-elektronicznie-wykorzystaj-podpis-zaufany" target="_blank">gov.pl</a>
            or with a qualified signature, as a person authorized for this NIP in KSeF.</li>
          <li>Upload the signed XML. The app stores a KSeF token, signing is needed only once.</li>
        </ol>
        <div class="mt-2 flex flex-wrap items-center gap-3">
          <button class="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50" :disabled="busy" @click="downloadAuthRequest">
            1. Download request
          </button>
          <!-- podpis.gov.pl may return the signed file as .xml or .xades -->
          <input type="file" accept=".xml,.xades,application/xml,text/xml"
                 @change="(e) => signedFile = (e.target as HTMLInputElement).files?.[0] ?? null" />
          <button class="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50" :disabled="busy || !signedFile" @click="uploadSigned">
            {{ busy ? 'Connecting...' : '3. Upload signed XML' }}
          </button>
        </div>
      </details>
    </template>
  </section>
</template>
