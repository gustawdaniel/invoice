import {useUserStore} from "~/store/user";
import {useCompanyStore} from "~/store/company";

// every company-scoped request carries the selected company
export function authHeaders(): Record<string, string> {
    const userStore = useUserStore();
    const companyStore = useCompanyStore();
    return {
        Authorization: `Bearer ${userStore.token}`,
        ...(companyStore.activeCompanyId ? {'x-company-id': companyStore.activeCompanyId} : {}),
    };
}
