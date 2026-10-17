import {useUserStore} from "~/store/user";

// $fetch for our API: an expired or invalid session sends the user to log in again
export const apiFetch = $fetch.create({
    async onResponseError({response}) {
        if (response.status !== 401) return;
        await useUserStore().logout();
        await navigateTo('/login');
    },
});
