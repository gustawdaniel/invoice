import { useUserStore } from "~/store/user"
import { tokenExpired } from "~/helpers/tokenExpired"

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userStore = useUserStore()

    if (userStore.user && userStore.token) {
        if (!tokenExpired(userStore.token)) return;
        await userStore.logout();
    }

    if (to.path !== '/login') {
        return navigateTo('/login')
    }
})
