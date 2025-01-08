// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    runtimeConfig: {
        public: {
            JSON_URL: process.env.NUXT_PUBLIC_JSON_URL ?? 'http://localhost:4000',
            NUXT_PUBLIC_EXCHANGE_RATES_API_TOKEN: process.env.NUXT_PUBLIC_EXCHANGE_RATES_API_TOKEN ?? ''
        }
    },
    modules: ['@nuxt/ui'],
    colorMode: {
        preference: 'light'
    }
})
