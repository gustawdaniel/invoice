import { FastifyInstance, FastifyPluginOptions, RouteShorthandOptions } from "fastify";

import { version } from '../controllers/app/version';
import { health } from '../controllers/app/health';

import { googleVerify } from '../controllers/auth/googleVerify';
import { logout } from '../controllers/auth/logout';

import { listExchangeRates } from "../controllers/exchange/listExchangeRates";
import { latestExchangeRate } from "../controllers/exchange/latestExchangeRate";
import { syncExchangeRate } from "../controllers/exchange/syncExchangeRate";

import { getCompany } from "../controllers/company/getCompany";
import { putCompany, type PutCompanyBody } from "../controllers/company/putCompany";
import { listCompanies } from "../controllers/company/listCompanies";
import { addCompany, type AddCompanyRoute } from "../controllers/company/addCompany";
import { setDefaultCompany, type SetDefaultCompanyRoute } from "../controllers/company/setDefaultCompany";

import { listClients } from "../controllers/client/listClients";
import { addClient, AddClientBody } from "../controllers/client/addClient";
import { updateClient, UpdateClientRoute } from "../controllers/client/updateClient";
import { deleteClient, DeleteClientRoute } from "../controllers/client/deleteClient";

import { listInvoices } from "../controllers/invoice/listInvoices";
import { addInvoice, AddInvoiceRoute } from "../controllers/invoice/addInvoice";
import { updateInvoice, UpdateInvoiceRoute } from "../controllers/invoice/updateInvoice";
import { deleteInvoice, DeleteInvoiceRoute } from "../controllers/invoice/deleteInvoice";
import { recordPayment, type RecordPaymentRoute } from "../controllers/invoice/recordPayment";

import { dismissKsefRequest, sendToKsef, type SendToKsefRoute } from "../controllers/ksef/sendToKsef";
import {
    addAgentKey,
    deleteAgentKey,
    listAgentKeys,
    type AddAgentKeyRoute,
    type DeleteAgentKeyRoute,
} from "../controllers/agents/agentKeys";
import { listAllCompanies } from "../controllers/admin/listAllCompanies";
import {
    classifyTransaction,
    listBankTransactions,
    listCosts,
    updateCost,
    type ClassifyTransactionRoute,
    type UpdateCostRoute,
} from "../controllers/books/books";
import { mcp } from "../controllers/agents/mcp";
import { lookupNip, type LookupNipRoute } from "../controllers/lookup/lookupNip";
import { getKsefXml, type GetKsefXmlRoute } from "../controllers/ksef/getKsefXml";
import {
    connectKsefWithToken,
    disconnectKsef,
    ksefAuthRequest,
    ksefAuthSigned,
    type KsefAuthSignedRoute,
    type KsefEnvRoute,
    type KsefTokenRoute,
} from "../controllers/ksef/connectKsef";

const PUBLIC: RouteShorthandOptions = { config: { isPrivate: false } };
const SECRET: RouteShorthandOptions = { config: { isPrivate: true } };
const ADMIN: RouteShorthandOptions = { config: { isPrivate: true, isAdmin: true } };

export default function indexRoute(
    server: FastifyInstance,
    _options: FastifyPluginOptions,
    next: () => void,
): void {
    server.get('/', PUBLIC, version);
    server.get('/health', PUBLIC, health);

    // auth
    server.post('/logout', SECRET, logout);
    server.post<{ Body: { credential: string } }>('/google-verify', PUBLIC, googleVerify)

    // exchange rates
    server.get('/exchange-rates', SECRET, listExchangeRates);
    server.get('/exchange-rates/latest', SECRET, latestExchangeRate);
    server.post('/sync-exchange-rates', SECRET, syncExchangeRate);

    // Polish taxpayer data by NIP (MF White List)
    server.get<LookupNipRoute>('/lookup/nip/:nip', SECRET, lookupNip);

    // companies of the user; /company is the one selected by the x-company-id header
    server.get('/companies', SECRET, listCompanies);
    server.post<AddCompanyRoute>('/companies', SECRET, addCompany);
    server.put<SetDefaultCompanyRoute>('/companies/:id/default', SECRET, setDefaultCompany);
    server.get('/company', SECRET, getCompany);
    server.put<PutCompanyBody>('/company', SECRET, putCompany);

    // ksef connections of the selected company, :env is prod (live mode) or demo (test mode)
    server.get<KsefEnvRoute>('/company/ksef/:env/auth-request', SECRET, ksefAuthRequest);
    server.post<KsefAuthSignedRoute>('/company/ksef/:env/auth-signed', SECRET, ksefAuthSigned);
    server.post<KsefTokenRoute>('/company/ksef/:env/token', SECRET, connectKsefWithToken);
    server.delete<KsefEnvRoute>('/company/ksef/:env', SECRET, disconnectKsef);

    // client
    server.get('/clients', SECRET, listClients);
    server.post<AddClientBody>('/clients', SECRET, addClient);
    server.put<UpdateClientRoute>('/clients/:id', SECRET, updateClient);
    server.delete<DeleteClientRoute>('/clients/:id', SECRET, deleteClient);

    // invoice
    server.get('/invoices', SECRET, listInvoices);
    server.post<AddInvoiceRoute>('/invoices', SECRET, addInvoice);
    server.put<UpdateInvoiceRoute>('/invoices/:id', SECRET, updateInvoice);
    server.delete<DeleteInvoiceRoute>('/invoices/:id', SECRET, deleteInvoice);
    server.put<RecordPaymentRoute>('/invoices/:id/payment', SECRET, recordPayment);
    server.post<SendToKsefRoute>('/invoices/:id/ksef', SECRET, sendToKsef);
    server.get<GetKsefXmlRoute>('/invoices/:id/ksef/xml', SECRET, getKsefXml);
    server.delete<SendToKsefRoute>('/invoices/:id/ksef-request', SECRET, dismissKsefRequest);

    // bookkeeping of the selected company; agents load and classify through MCP, humans review here
    server.get('/bank-transactions', SECRET, listBankTransactions);
    server.put<ClassifyTransactionRoute>('/bank-transactions/:id', SECRET, classifyTransaction);
    server.get('/costs', SECRET, listCosts);
    server.put<UpdateCostRoute>('/costs/:id', SECRET, updateCost);

    // AI agents: keys are managed by the logged in human, agents use them only on /mcp (own auth, see mcp.ts)
    server.get('/agent-keys', SECRET, listAgentKeys);
    server.post<AddAgentKeyRoute>('/agent-keys', SECRET, addAgentKey);
    server.delete<DeleteAgentKeyRoute>('/agent-keys/:id', SECRET, deleteAgentKey);
    server.all('/mcp', PUBLIC, mcp);

    // admin
    server.get('/admin/companies', ADMIN, listAllCompanies);

    next();
}
