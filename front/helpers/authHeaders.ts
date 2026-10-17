import {useUserStore} from "~/store/user";
import {useCompanyStore} from "~/store/company";

// every company-scoped request carries the selected company and the mode (live / test)
export function authHeaders(): Record<string, string> {
    const userStore = useUserStore();
    const companyStore = useCompanyStore();
    return {
        Authorization: `Bearer ${userStore.token}`,
        ...(companyStore.activeCompanyId ? {'x-company-id': companyStore.activeCompanyId} : {}),
        // test mode: only test invoices, sent to KSeF DEMO
        ...(companyStore.testMode ? {'x-mode': 'test'} : {}),
    };
}
