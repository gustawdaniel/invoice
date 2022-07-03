import {ref} from "vue";
import {Client} from '~/interfaces/Client';

export function useClient() {
    let client = ref<Client>({
        name: '',
        city: '',
        post: '',
        street: '',
        tin: '',
    })

    let clients = ref<Client[]>([])

    return {
        client, clients
    }
}