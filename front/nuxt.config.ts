import z from "zod";

const configSchema = z.object({
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is missing"),
    VITE_API_URL: z.string(),
});

const env = configSchema.parse(process.env)

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    ssr: false,

    runtimeConfig: {
        public: {
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