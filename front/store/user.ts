import {defineStore} from 'pinia';
import {ref, computed} from 'vue';

type Role = 'admin' | 'user';

export interface User {
    id: string;
    email: string;
    full_name: string;
    avatar: string;
    roles: Role[];
}

export interface GoogleVerifyResponse {
    token: string;
    user: User;
}

export const useUserStore = defineStore(
        'userStore',
        (): {
            user: Ref<User | null>;
            token: Ref<string | null>;
            logout: () => Promise<void>;
            isAdmin: ComputedRef<boolean>;
            verifyGoogleCredential: (credential: string) => Promise<void>;

        } => {
            const user = ref<User | null>(null);
            const token = ref<string | null>(null);

            async function logout() {
                user.value = null;
                token.value = null;
                localStorage.clear();
            }

            async function verifyGoogleCredential(credential: string) {
                try {
                    const res = await $fetch<GoogleVerifyResponse>(`${import.meta.env.VITE_API_URL}/google-verify`, {
                        method: 'POST',
                        body: JSON.stringify({credential})
                    })

                    console.log("verified user", res);
                    token.value = res.token;
                    user.value = res.user;

                    localStorage.setItem('user', JSON.stringify(user.value));
                    localStorage.setItem('token', JSON.stringify(token.value));

                    // window.userStore = userStore;
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            }

            const isAdmin = computed(() => user.value?.roles.includes('admin') ?? false);

            return {
                user,
                token,
                isAdmin,
                verifyGoogleCredential,
                logout
            }
        },
    {
        persist: true,
    },
    )
;