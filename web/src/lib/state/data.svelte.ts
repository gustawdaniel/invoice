import { clientFromApi, fromApi, toApi } from '../invoice';
import type { AgentKey, BankTransaction, Client, Company, Cost, ExchangeRate, Invoice, KsefEnv, NipLookup, User } from '../types';
import { api } from './api';
import { session } from './session.svelte';

function emptyCompany(): Company {
	return {
		id: '',
		name: '',
		tin: '',
		address: '',
		info: '',
		logo: '',
		signature: '',
		country: 'GE',
		vatExemptionBasis: '',
		defaultIssuePlace: '',
		defaultIssuerName: '',
		defaultBankAccountNumber: '',
		defaultPublicNote: '',
		ksefConnected: false,
		ksefDemoConnected: false
	};
}

// everything the screens show for the selected company, loaded fresh from the API
class Data {
	companies = $state<Company[]>([]);
	company = $state<Company>(emptyCompany());
	clients = $state<Client[]>([]);
	invoices = $state<Invoice[]>([]);
	keys = $state<AgentKey[]>([]);
	// the books: loaded when a bookkeeping screen opens
	transactions = $state<BankTransaction[]>([]);
	costs = $state<Cost[]>([]);
	rate = $state<ExchangeRate | null>(null);
	loading = $state(false);
	loaded = $state(false);

	// KSeF is used by Polish companies; connected = in the environment of the current mode
	get usesKsef() {
		return this.company.country === 'PL';
	}

	get ksefConnected() {
		return session.testMode ? this.company.ksefDemoConnected : this.company.ksefConnected;
	}

	// agent requests a human has to approve or dismiss
	get waiting() {
		return this.invoices.filter((inv) => inv.ksefSendRequestedAt && !inv.ksefNumber);
	}

	// bank operations the agent could not classify
	get bankToReview() {
		return this.transactions.filter((t) => t.status === 'review').length;
	}

	get costsToReview() {
		return this.costs.filter((c) => c.status === 'review').length;
	}

	invoice(id: string) {
		return this.invoices.find((inv) => inv.id === id);
	}

	async loadAll() {
		this.loading = true;
		try {
			const [companies, company] = await Promise.all([
				api<Company[]>('/companies'),
				api<Company>('/company')
			]);
			this.companies = companies;
			this.company = company;
			await Promise.all([this.loadClients(), this.loadInvoices(), this.loadRate()]);
			this.loaded = true;
		} finally {
			this.loading = false;
		}
	}

	async loadClients() {
		this.clients = (await api<unknown[]>('/clients')).map(clientFromApi);
	}

	async loadInvoices() {
		this.invoices = (await api<unknown[]>('/invoices')).map(fromApi);
	}

	async loadBooks() {
		const [transactions, costs] = await Promise.all([api<BankTransaction[]>('/bank-transactions'), api<Cost[]>('/costs')]);
		this.transactions = transactions;
		this.costs = costs;
	}

	// a human decision on a bank operation
	async classify(id: string, change: Partial<Pick<BankTransaction, 'kind' | 'status' | 'invoiceId' | 'costId' | 'note'>>) {
		const saved = await api<BankTransaction>(`/bank-transactions/${id}`, { method: 'PUT', body: change });
		const index = this.transactions.findIndex((t) => t.id === id);
		if (index >= 0) this.transactions[index] = saved;
		return saved;
	}

	async updateCost(id: string, change: Partial<Pick<Cost, 'category' | 'reverseCharge' | 'status' | 'note'>>) {
		const saved = await api<Cost>(`/costs/${id}`, { method: 'PUT', body: change });
		const index = this.costs.findIndex((c) => c.id === id);
		if (index >= 0) this.costs[index] = saved;
		return saved;
	}

	async loadKeys() {
		this.keys = await api<AgentKey[]>('/agent-keys');
	}

	// the API stores one rate a day, syncing it is cheap when already there
	async loadRate() {
		try {
			this.rate = await api<ExchangeRate>('/sync-exchange-rates', { method: 'POST' });
		} catch {
			this.rate = null;
		}
	}

	async rates() {
		return api<ExchangeRate[]>('/exchange-rates');
	}

	async switchCompany(id: string) {
		session.companyId = id;
		session.persist();
		this.clients = [];
		this.invoices = [];
		this.transactions = [];
		this.costs = [];
		await this.loadAll();
	}

	// live and test mode have separate invoices, like Stripe test data
	async setTestMode(enabled: boolean) {
		session.testMode = enabled;
		session.persist();
		this.invoices = [];
		await this.loadInvoices();
	}

	get defaultCompany() {
		return this.companies.find((c) => c.isDefault) ?? null;
	}

	// the company that opens after login
	async setDefaultCompany(id: string) {
		await api(`/companies/${id}/default`, { method: 'PUT' });
		this.companies = this.companies.map((c) => ({ ...c, isDefault: c.id === id }));
	}

	async addCompany(name: string, country: Company['country']) {
		const created = await api<Company>('/companies', { method: 'POST', body: { name, country } });
		this.companies.push(created);
		await this.switchCompany(created.id);
	}

	private replaceCompany(updated: Company) {
		this.company = updated;
		const index = this.companies.findIndex((c) => c.id === updated.id);
		// /company does not say which company is the default, the list does
		if (index >= 0) this.companies[index] = { ...updated, isDefault: this.companies[index].isDefault };
	}

	async saveCompany(fields: Partial<Company>) {
		const { id: _id, ksefConnected: _a, ksefDemoConnected: _b, ...body } = fields;
		this.replaceCompany(await api<Company>('/company', { method: 'PUT', body }));
	}

	async saveClient(client: Client): Promise<Client> {
		const { id, ...body } = client;
		const saved = clientFromApi(
			await api(id ? `/clients/${id}` : '/clients', { method: id ? 'PUT' : 'POST', body })
		);
		const index = this.clients.findIndex((c) => c.id === saved.id);
		if (index >= 0) this.clients[index] = saved;
		else this.clients.push(saved);
		return saved;
	}

	async deleteClient(id: string) {
		await api(`/clients/${id}`, { method: 'DELETE' });
		this.clients = this.clients.filter((c) => c.id !== id);
	}

	async saveInvoice(invoice: Invoice): Promise<Invoice> {
		const saved = fromApi(
			await api(invoice.id ? `/invoices/${invoice.id}` : '/invoices', {
				method: invoice.id ? 'PUT' : 'POST',
				body: toApi(invoice)
			})
		);
		const index = this.invoices.findIndex((inv) => inv.id === saved.id);
		if (index >= 0) this.invoices[index] = saved;
		else this.invoices.push(saved);
		return saved;
	}

	// payment facts, allowed also on invoices already in KSeF
	async recordPayment(id: string, payment: Pick<Invoice, 'paid' | 'paymentDate' | 'withholdingTax' | 'privateNote'>): Promise<Invoice> {
		const saved = fromApi(await api(`/invoices/${id}/payment`, { method: 'PUT', body: payment }));
		const index = this.invoices.findIndex((inv) => inv.id === saved.id);
		if (index >= 0) this.invoices[index] = saved;
		return saved;
	}

	async deleteInvoice(id: string) {
		await api(`/invoices/${id}`, { method: 'DELETE' });
		this.invoices = this.invoices.filter((inv) => inv.id !== id);
	}

	// the backend picks production KSeF or DEMO from the invoice itself
	async sendToKsef(id: string) {
		try {
			await api(`/invoices/${id}/ksef`, { method: 'POST' });
		} finally {
			// the status or the KSeF error is stored on the invoice either way
			await this.loadInvoices();
		}
	}

	async dismissKsefRequest(id: string) {
		await api(`/invoices/${id}/ksef-request`, { method: 'DELETE' });
		await this.loadInvoices();
	}

	async ksefXml(id: string) {
		return api<string>(`/invoices/${id}/ksef/xml`, { text: true });
	}

	async lookupNip(nip: string) {
		return api<NipLookup>(`/lookup/nip/${encodeURIComponent(nip.replace(/\D/g, ''))}`);
	}

	async ksefAuthRequest(env: KsefEnv) {
		return api<string>(`/company/ksef/${env}/auth-request`, { text: true });
	}

	async ksefSigned(env: KsefEnv, signedXml: string) {
		this.replaceCompany(await api<Company>(`/company/ksef/${env}/auth-signed`, { method: 'POST', body: { signedXml } }));
	}

	async ksefToken(env: KsefEnv, token: string) {
		this.replaceCompany(await api<Company>(`/company/ksef/${env}/token`, { method: 'POST', body: { token } }));
	}

	async ksefDisconnect(env: KsefEnv) {
		this.replaceCompany(await api<Company>(`/company/ksef/${env}`, { method: 'DELETE' }));
	}

	// the plain key is in the response only this one time
	async createKey(name: string): Promise<string> {
		const { key, ...created } = await api<AgentKey & { key: string }>('/agent-keys', { method: 'POST', body: { name } });
		this.keys.unshift(created);
		return key;
	}

	async deleteKey(id: string) {
		await api(`/agent-keys/${id}`, { method: 'DELETE' });
		this.keys = this.keys.filter((key) => key.id !== id);
	}

	async login(credential: string) {
		const { token, user } = await api<{ token: string; user: User }>('/google-verify', {
			method: 'POST',
			body: { credential },
			anonymous: true
		});
		session.login(token, user);
		await this.loadAll();
	}

	async logout() {
		try {
			await api('/logout', { method: 'POST' });
		} catch {
			// the session ends locally anyway
		}
		session.logout();
		this.companies = [];
		this.company = emptyCompany();
		this.clients = [];
		this.invoices = [];
		this.keys = [];
		this.loaded = false;
	}
}

export const data = new Data();
