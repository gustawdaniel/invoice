import {ref} from "vue";

export function useCompany() {
    let company = ref({
        logo: '',
        name: '',
        address: '',
        info: '',
    })

    return {
        company
    }
}