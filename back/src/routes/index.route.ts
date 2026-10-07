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

import { listClients } from "../controllers/client/listClients";
import { addClient, AddClientBody } from "../controllers/client/addClient";
import { updateClient, UpdateClientRoute } from "../controllers/client/updateClient";
import { deleteClient, DeleteClientRoute } from "../controllers/client/deleteClient";

import { listInvoices } from "../controllers/invoice/listInvoices";
import { addInvoice, AddInvoiceRoute } from "../controllers/invoice/addInvoice";
import { updateInvoice, UpdateInvoiceRoute } from "../controllers/invoice/updateInvoice";
import { deleteInvoice, DeleteInvoiceRoute } from "../controllers/invoice/deleteInvoice";

import { sendToKsef, type SendToKsefRoute } from "../controllers/ksef/sendToKsef";
import { lookupNip, type LookupNipRoute } from "../controllers/lookup/lookupNip";
import { getKsefXml, type GetKsefXmlRoute } from "../controllers/ksef/getKsefXml";
import {
    connectKsefTest,
    disconnectKsef,
    ksefProdAuthRequest,
    ksefProdAuthSigned,
    type KsefProdAuthSignedRoute,
} from "../controllers/ksef/connectKsef";

const PUBLIC: RouteShorthandOptions = { config: { isPrivate: false } };
const SECRET: RouteShorthandOptions = { config: { isPrivate: true } };

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
    server.get('/company', SECRET, getCompany);
    server.put<PutCompanyBody>('/company', SECRET, putCompany);

    // ksef connection of the selected company
    server.post('/company/ksef/test-connect', SECRET, connectKsefTest);
    server.get('/company/ksef/auth-request', SECRET, ksefProdAuthRequest);
    server.post<KsefProdAuthSignedRoute>('/company/ksef/auth-signed', SECRET, ksefProdAuthSigned);
    server.delete('/company/ksef', SECRET, disconnectKsef);

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
    server.post<SendToKsefRoute>('/invoices/:id/ksef', SECRET, sendToKsef);
    server.get<GetKsefXmlRoute>('/invoices/:id/ksef/xml', SECRET, getKsefXml);

    next();
}
