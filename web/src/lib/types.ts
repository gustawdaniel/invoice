export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP';
export type Lang = 'pl' | 'en';
export type Country = 'PL' | 'GE' | 'GB';
// prod: production KSeF (live mode), demo: KSeF DEMO (test mode, no legal effect)
export type KsefEnv = 'prod' | 'demo';

export type PaymentKey =
	| 'cash'
	| 'prepaid'
	| '14d'
	| '7d'
	| 'card'
	| 'delivery'
	| 'check'
	| 'dotpay'
	| 'paypal'
	| 'payu'
	| 'other';

export type VatName =
	| '23%'
	| '19%'
	| '18%'
	| '8%'
	| '5%'
	| '0%'
	| 'zw.'
	| 'exempt.'
	| 'np.'
	| 'np. EU'
	| '0% WDT'
	| '0% Exp.'
	| 'o.o.';

export type Unit =
	| 'piece'
	| 'service'
	| 'hour'
	| 'pack.'
	| 'box'
	| 'palette'
	| 't.'
	| 'kg'
	| 'm2'
	| 'm3'
	| 'km'
	| 'mb'
	| 'l'
	| 'mh.';

export interface Vat {
	name: VatName;
	value: number;
}

export interface Item {
	name: string;
	unit: Unit;
	quantity: number;
	priceNet: number;
	vat: Vat;
}

export interface Client {
	id: string;
	name: string;
	street: string;
	post: string;
	city: string;
	tin: string;
	tinName: string;
	country: string;
}

export interface Invoice {
	id: string;
	number: string;
	clientId: string;
	client: Client;
	issueDate: string; // YYYY-MM-DD
	saleDate: string;
	deadlineDate: string;
	paymentDate: string | null;
	issuePlace: string;
	paymentForm: PaymentKey;
	currency: Currency;
	lang: Lang;
	items: Item[];
	issuerName: string;
	receiverName: string;
	bankAccountNumber: string;
	publicNote: string;
	privateNote: string;
	paid: number;
	// withheld by a foreign client for its tax office; paid + withholdingTax covering the gross settles the invoice
	withholdingTax: number;
	// issued before KSeF in another program: final, never sent to KSeF
	outsideKsef: boolean;
	// false: test mode invoice (KSeF DEMO, no legal effect)
	livemode: boolean;
	ksefEnv: 'test' | 'demo' | 'prod' | null;
	ksefStatus: string | null;
	ksefNumber: string | null;
	ksefQrUrl: string | null;
	ksefError: string | null;
	ksefSentAt: string | null;
	// name of the agent key that drafted it through MCP
	createdByAgent: string | null;
	// an agent asked to send it to production KSeF, a human approves or dismisses
	ksefSendRequestedAt: string | null;
	ksefSendRequestedBy: string | null;
	ksefSendRequestNote: string | null;
}

export interface Company {
	id: string;
	name: string;
	tin: string;
	address: string;
	info: string;
	logo: string;
	signature: string;
	country: Country;
	vatExemptionBasis: string;
	krs: string;
	regon: string;
	defaultIssuePlace: string;
	defaultIssuerName: string;
	defaultBankAccountNumber: string;
	defaultPublicNote: string;
	ksefConnected: boolean;
	ksefDemoConnected: boolean;
	// opens after login; only in the list of companies
	isDefault?: boolean;
}

export interface User {
	id: string;
	email: string;
	full_name: string;
	avatar: string;
	roles: ('admin' | 'user')[];
}

export interface AgentKey {
	id: string;
	name: string;
	prefix: string;
	createdAt: string;
	lastUsedAt: string | null;
}

export interface ExchangeRate {
	date: string;
	// units of each currency for 1 EUR
	EUR: number;
	PLN: number;
	USD: number;
	GBP: number;
}

export interface NipLookup {
	nip: string;
	name: string;
	street: string;
	post: string;
	city: string;
	address: string;
	statusVat: string;
}

export type TransactionKind =
	| 'unclassified'
	| 'sale_payment'
	| 'refund'
	| 'shareholder_loan'
	| 'capital'
	| 'interest'
	| 'cost_payment'
	| 'shareholder_repayment'
	| 'salary'
	| 'tax'
	| 'zus'
	| 'bank_fee'
	| 'private'
	| 'own_transfer'
	| 'other';

// auto: classified by a rule or an agent; confirmed: by the human; review: waiting for the human
export type BookStatus = 'auto' | 'confirmed' | 'review';

export interface BankTransaction {
	id: string;
	externalId: string;
	bank: string;
	account: string;
	date: string;
	amount: number;
	currency: string;
	description: string;
	bankCategory: string;
	kind: TransactionKind;
	status: BookStatus;
	invoiceId: string | null;
	costId: string | null;
	note: string;
}

export type CostCategory =
	| 'hosting'
	| 'software'
	| 'equipment'
	| 'office'
	| 'travel'
	| 'accounting'
	| 'legal'
	| 'marketing'
	| 'education'
	| 'subcontractor'
	| 'telecom'
	| 'other';

export interface Cost {
	id: string;
	externalId: string;
	supplierName: string;
	supplierTin: string;
	supplierCountry: string;
	number: string;
	issueDate: string;
	saleDate: string | null;
	currency: string;
	net: number;
	vat: number;
	gross: number;
	category: CostCategory;
	reverseCharge: boolean;
	file: string;
	status: BookStatus;
	note: string;
}

export type FilingStatus = 'missing' | 'todo' | 'check' | 'filed' | 'accepted' | 'not_required';

// a tax return, JPK file, financial statement or registration the company owes
export interface Filing {
	id: string;
	externalId: string;
	kind: string;
	period: string;
	authority: string;
	dueDate: string | null;
	status: FilingStatus;
	filedAt: string | null;
	reference: string;
	amount: number | null;
	note: string;
}

export type DocumentKind = 'contract' | 'tax' | 'invoice' | 'accounting' | 'other';

// a contract, tax decision or other company file: a private upload or an external link
export interface CompanyDocument {
	id: string;
	title: string;
	kind: DocumentKind;
	url: string;
	fileName: string;
	mimeType: string;
	size: number;
	note: string;
	hasFile: boolean;
	createdAt: string;
	updatedAt: string;
}
