import {useUserStore} from "~/store/user";

type FetchOptions = NonNullable<Parameters<typeof $fetch>[1]>;

// $fetch for our API: an expired or invalid session sends the user to log in again
export function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
    return $fetch<T>(url, {
        ...options,
        async onResponseError({response}) {
            if (response.status !== 401) return;
            await useUserStore().logout();
            await navigateTo('/login');
        },
    }) as Promise<T>;
}
