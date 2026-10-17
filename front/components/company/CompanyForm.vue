<script setup lang="ts">
import { useCompanyStore, type Company } from "~/store/company";
import { lookupNip } from "~/helpers/lookupNip";
import { useCompanySwitch } from "~/composables/useCompanySwitch";
import KsefConnection from "~/components/company/KsefConnection.vue";
const companyStore = useCompanyStore();
const { createCompany } = useCompanySwitch();
const toast = useToast();
const lookingUp = ref(false);
const newPolishName = ref('');

const form = ref<Company>({ ...companyStore.company });
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const isPolish = computed(() => form.value.country === 'PL');

// Convert file to base64
const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

// Handle file input change
const handleFileUpload = async (event: Event, field: "logo" | "signature") => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    form.value[field] = await toBase64(file);
  }
};

function isValidNip(nip: string): boolean {
  const digits = nip.replace(/\D/g, '');
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((s, w, i) => s + w * Number(digits[i]), 0);
  return sum % 11 === Number(digits[9]);
}

// Form validation
const validate = () => {
  errors.value = {};
  if (!form.value.name) errors.value.name = "Company name is required.";
  if (!form.value.address) errors.value.address = "Address is required.";
  if (isPolish.value && !isValidNip(form.value.tin)) errors.value.tin = "Invalid NIP.";
  return Object.keys(errors.value).length === 0;
};

function syncForm() {
  form.value = { ...companyStore.company };
}

// Fetch company data on mount and when another company is selected
onMounted(async () => {
  loading.value = true;
  await companyStore.getCompany();
  syncForm();
  loading.value = false;
});
watch(() => companyStore.company.id, syncForm);

// Save company data
const saveCompany = async () => {
  if (!validate()) return;
  loading.value = true;
  try {
    const { id, ksefConnected, ksefDemoConnected, ...data } = form.value;
    await companyStore.setCompany(data);
    syncForm();
    toast.add({ title: "Success", description: "Company details updated successfully!" });
  } catch (e) {
    toast.add({ title: "Error", description: (e as Error).message, color: 'error' });
  } finally {
    loading.value = false;
  }
};

// Fill name and address from the MF White List; also suggests the VAT exemption basis
async function fillFromMf() {
  if (!isValidNip(form.value.tin)) {
    errors.value = { ...errors.value, tin: "Enter a valid NIP first." };
    return;
  }
  lookingUp.value = true;
  try {
    const data = await lookupNip(form.value.tin);
    form.value.name = data.name;
    form.value.address = data.address;
    form.value.tin = data.nip;
    let description = `VAT status: ${data.statusVat}.`;
    if (data.statusVat !== 'Czynny' && !form.value.vatExemptionBasis) {
      form.value.vatExemptionBasis = 'Art. 113 ust. 1 ustawy o VAT';
      description += ' Not an active VAT payer, so the art. 113 exemption was filled in — check it.';
    }
    toast.add({ title: "Filled from MF White List", description: `${description} Remember to save.` });
  } catch (e) {
    toast.add({ title: "MF lookup failed", description: (e as Error).message, color: 'error' });
  } finally {
    lookingUp.value = false;
  }
}

// Setup steps of a Polish company, based on the saved state
const steps = computed(() => {
  const c = companyStore.company;
  return [
    { done: isValidNip(c.tin), label: 'NIP' },
    { done: Boolean(c.address), label: 'Address' },
    { done: c.ksefConnected, label: 'KSeF production connected' },
    { done: c.ksefDemoConnected, label: 'KSeF DEMO connected (optional, for test mode)', optional: true },
  ];
});
const ready = computed(() => steps.value.every(step => step.done || step.optional));

async function addPolishCompany() {
  if (!newPolishName.value.trim()) return;
  try {
    await createCompany(newPolishName.value.trim(), 'PL');
    newPolishName.value = '';
    toast.add({ title: "Company added", description: "Now fill in its NIP and connect KSeF." });
  } catch (e) {
    toast.add({ title: "Error", description: (e as Error).message, color: 'error' });
  }
}

</script>

<template>
  <div class="max-w-3xl mx-auto bg-white p-6 ">
    <h2 class="text-xl font-semibold mb-4">Company Information</h2>

    <!-- Georgian company: point to adding a Polish one, KSeF lives there -->
    <div v-if="companyStore.company.country === 'GE'" class="mb-6 rounded-md border border-indigo-200 bg-indigo-50 p-4 text-sm">
      <p class="mb-2">
        This company is Georgian, its invoices do not go to KSeF.
        To issue Polish invoices with KSeF, add a Polish company — you switch between companies in the header.
      </p>
      <form class="flex flex-wrap gap-2" @submit.prevent="addPolishCompany">
        <input v-model="newPolishName" placeholder="Polish company name, e.g. Precise Lab" class="grow rounded-md border-gray-300 text-sm">
        <button type="submit" class="rounded bg-indigo-600 px-3 py-1 text-white cursor-pointer">Add Polish company</button>
      </form>
    </div>

    <!-- Polish company: what is left before invoices can be sent to KSeF -->
    <div v-else-if="companyStore.company.country === 'PL'"
         :class="ready ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'"
         class="mb-6 rounded-md border p-4 text-sm">
      <p class="font-semibold mb-1">{{ ready ? 'Ready to send invoices to KSeF' : 'KSeF setup' }}</p>
      <ul>
        <li v-for="step in steps" :key="step.label">{{ step.done ? '✅' : '⬜' }} {{ step.label }}</li>
      </ul>
    </div>

    <form @submit.prevent="saveCompany" class="space-y-4">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Company Name</label>
        <UInput v-model="form.name" type="text" class="mt-1 block w-full" />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>

      <!-- Country -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Country</label>
        <select v-model="form.country" class="mt-1 rounded-md border-gray-300 text-sm">
          <option value="GE">Georgia (no KSeF)</option>
          <option value="PL">Poland (KSeF)</option>
        </select>
      </div>

      <!-- Tax ID -->
      <div>
        <label class="block text-sm font-medium text-gray-700">{{ isPolish ? 'NIP' : 'Tax ID' }}</label>
        <div class="mt-1 flex gap-2">
          <UInput v-model="form.tin" type="text" class="block w-full" />
          <button v-if="isPolish" type="button" :disabled="lookingUp"
                  class="whitespace-nowrap rounded border border-gray-300 px-3 text-sm hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                  title="Fill name, address and VAT status from the MF White List"
                  @click="fillFromMf">{{ lookingUp ? 'Loading...' : 'Fill from MF' }}</button>
        </div>
        <p v-if="errors.tin" class="text-red-500 text-xs mt-1">{{ errors.tin }}</p>
      </div>

      <!-- Address -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Address</label>
        <UInput v-model="form.address" type="text" class="mt-1 block w-full"
                placeholder="ul. Grzybowska 85A/32, 00-844 Warszawa" />
        <p class="text-gray-500 text-xs mt-1">Street, then a comma, then postcode and city.</p>
        <p v-if="errors.address" class="text-red-500 text-xs mt-1">{{ errors.address }}</p>
      </div>

      <!-- Info -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Company Info</label>
        <UTextarea v-model="form.info" class="mt-1 block w-full" />
      </div>

      <template v-if="isPolish">
        <!-- VAT exemption -->
        <div>
          <label class="block text-sm font-medium text-gray-700">VAT exemption basis</label>
          <UInput v-model="form.vatExemptionBasis" type="text" class="mt-1 block w-full"
                  placeholder="Art. 113 ust. 1 ustawy o VAT" />
          <p class="text-gray-500 text-xs mt-1">Required on invoices with "zw." items. Leave empty for VAT payers.</p>
        </div>

      </template>

      <!-- Logo Upload -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Logo</label>
        <input type="file" accept="image/*" @change="(e) => handleFileUpload(e, 'logo')" class="mt-1" />
        <img v-if="form.logo" :src="form.logo" alt="Company Logo" class="mt-2 h-16 rounded-md shadow-sm" />
      </div>

      <!-- Signature Upload -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Signature</label>
        <input type="file" accept="image/*" @change="(e) => handleFileUpload(e, 'signature')" class="mt-1" />
        <img v-if="form.signature" :src="form.signature" alt="Signature" class="mt-2 h-16 rounded-md shadow-sm" />
      </div>

      <!-- Save Button -->
      <div>
        <button
            type="submit"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 cursor-pointer"
            :disabled="loading"
        >
          <span v-if="loading">Saving...</span>
          <span v-else>Save Changes</span>
        </button>
      </div>
    </form>

    <!-- KSeF connections, work on the saved state of the company; like Stripe live and test keys -->
    <div v-if="companyStore.usesKsef" class="mt-8 border-t pt-6 space-y-4">
      <KsefConnection env="prod" />
      <KsefConnection env="demo" />
      <p class="text-xs text-gray-500">Changing the NIP disconnects both.</p>
    </div>
  </div>
</template>
