import { useUserStore } from "~/store/user"

export default defineNuxtRouteMiddleware((to, from) => {
    const userStore = useUserStore()

    if (userStore.user && userStore.token) {
        return;
    }

    if (to.path !== '/login') {
        return navigateTo('/login')
    }
})
