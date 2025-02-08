import z from "zod";

const configSchema = z.object({
    GOOGLE_CLIENT_ID: z.string(),
    VITE_API_URL: z.string(),
    NUXT_PUBLIC_JSON_URL: z.string(),
});

const env = configSchema.parse(process.env)

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    ssr: false,

    runtimeConfig: {
        public: {
            JSON_URL: env.NUXT_PUBLIC_JSON_URL ?? 'http://localhost:4000',
            googleClientId: env.GOOGLE_CLIENT_ID,
        }
    },

    modules: [
        '@nuxt/ui',
        '@pinia/nuxt',
        'pinia-plugin-persistedstate/nuxt',
    ],

    piniaPluginPersistedstate: {
        storage: 'localStorage',
    },

    css: ['~/assets/css/main.css'],

    colorMode: {
        preference: 'light'
    },

    compatibilityDate: '2025-02-06'
})