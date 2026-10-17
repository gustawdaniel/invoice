import {apiErrorMessage} from "~/helpers/apiErrorMessage";

// errors nobody handled (failed requests, broken components) show a toast instead of only the console
export default defineNuxtPlugin((nuxtApp) => {
    const toast = useToast();
    const show = (error: unknown) => {
        console.error(error);
        toast.add({title: 'Something went wrong', description: apiErrorMessage(error), color: 'error'});
    };

    nuxtApp.hook('vue:error', show);
    window.addEventListener('unhandledrejection', (event) => show(event.reason));
    window.addEventListener('offline', () =>
        toast.add({title: 'You are offline', description: 'Changes will not be saved until the connection is back.', color: 'warning'}));
    window.addEventListener('online', () => toast.add({title: 'Back online', color: 'success'}));
});
