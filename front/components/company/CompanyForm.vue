<script setup lang="ts">
import { useCompanyStore } from "~/store/company";
const companyStore = useCompanyStore();
const toast = useToast();

const form = ref({ ...companyStore.company });
const loading = ref(false);
const errors = ref<Record<string, string>>({});

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

// Form validation
const validate = () => {
  errors.value = {};
  if (!form.value.name) errors.value.name = "Company name is required.";
  if (!form.value.address) errors.value.address = "Address is required.";
  if (!form.value.info) errors.value.info = "Company info is required.";
  return Object.keys(errors.value).length === 0;
};

// Fetch company data on mount
onMounted(async () => {
  loading.value = true;
  await companyStore.getCompany();
  form.value = { ...companyStore.company };
  loading.value = false;
});

// Save company data
const saveCompany = async () => {
  if (!validate()) return;
  loading.value = true;
  await companyStore.setCompany(form.value);
  toast.add({ title: "Success", description: "Company details updated successfully!" });
  loading.value = false;
};
</script>

<template>
  <div class="max-w-3xl mx-auto bg-white p-6 ">
    <h2 class="text-xl font-semibold mb-4">Company Information</h2>

    <form @submit.prevent="saveCompany" class="space-y-4">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Company Name</label>
        <UInput
            v-model="form.name"
            type="text"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>

      <!-- Address -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Address</label>
        <UInput
            v-model="form.address"
            type="text"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <p v-if="errors.address" class="text-red-500 text-xs mt-1">{{ errors.address }}</p>
      </div>

      <!-- Info -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Company Info</label>
        <UTextarea
            v-model="form.info"
            class="mt-1 block w-full border-gray-300 rounded-md  focus:ring-blue-500 focus:border-blue-500"
        ></UTextarea>
        <p v-if="errors.info" class="text-red-500 text-xs mt-1">{{ errors.info }}</p>
      </div>

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
  </div>
</template>
