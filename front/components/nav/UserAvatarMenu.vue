<script lang="ts" setup>
import { Bars3Icon, UserIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import {useUserStore} from "~/store/user";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/vue';

const userStore = useUserStore();

const avatar = computed<string>(() => {
  return userStore.user?.avatar ?? '';
});

const username = computed<string>(() => {
  return userStore.user?.full_name ?? '';
});

function logout() {
  userStore.logout().then(() => {
    const router = useRouter();
    router.push('/');
  });
}
</script>

<template>
  <div class="hidden sm:ml-6 sm:flex sm:items-center">
    <Menu as="div" class="relative ml-3">
      <div>
        <MenuButton
            class="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span class="absolute -inset-1.5" />
          <span class="sr-only">Open user menu</span>

          <img v-if="avatar" :src="avatar" :alt="username" class="h-8 w-auto rounded-full" />
          <UserIcon v-else aria-hidden="true" class="size-6" />
        </MenuButton>
      </div>
      <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="transform opacity-0 scale-95"
          enter-to-class="transform opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="transform opacity-100 scale-100"
          leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems
            class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          <MenuItem v-slot="{ active }">
            <NuxtLink
                :class="[
                      active ? 'bg-gray-100 outline-none' : '',
                      'block px-4 py-2 text-sm text-gray-700',
                    ]"
                to="/settings"
            >
              Profile:
              <span class="{ 'capitalize': !username.contains('@') }">
                      {{ username }}
                    </span>
            </NuxtLink>
          </MenuItem>

          <MenuItem v-slot="{ active }" v-if="userStore.isAdmin">
            <NuxtLink
                to="/admin"
                :class="[
                      active ? 'bg-gray-100 outline-none' : '',
                      'block cursor-pointer px-4 py-2 text-sm text-gray-700',
                    ]">Admin Panel</NuxtLink>
          </MenuItem>

<!--          TODO: impersonation-->
<!--          <MenuItem v-slot="{ active }" v-if="userStore.impersonatedFrom">-->
<!--            <button-->
<!--                @click="userStore.revertImpersonation()"-->
<!--                :class="[-->
<!--                      active ? 'bg-gray-100 outline-none' : '',-->
<!--                      'block cursor-pointer px-4 py-2 text-sm text-gray-700',-->
<!--                    ]"-->
<!--            >Stop impersonating</button>-->
<!--          </MenuItem>-->

          <MenuItem v-slot="{ active }">
            <a
                :class="[
                      active ? 'bg-gray-100 outline-none' : '',
                      'block cursor-pointer px-4 py-2 text-sm text-gray-700',
                    ]"
                @click="logout"
            >Sign out</a
            >
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<style scoped>

</style>