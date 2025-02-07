import {FastifyInstance, FastifyPluginOptions, RouteShorthandOptions} from "fastify";

import { version } from '../controllers/app/version';

import { googleVerify } from '../controllers/auth/googleVerify';
import { logout } from '../controllers/auth/logout';

import {listExchangeRates} from "../controllers/exchange/listExchangeRates";
import {latestExchangeRate} from "../controllers/exchange/latestExchangeRate";
import {syncExchangeRate} from "../controllers/exchange/syncExchangeRate";

import {getCompany} from "../controllers/company/getCompany";
import {putCompany, type PutCompanyBody} from "../controllers/company/putCompany";

const PUBLIC: RouteShorthandOptions = { config: { isPrivate: false } };
const SECRET: RouteShorthandOptions = { config: { isPrivate: true } };

export default function indexRoute(
    server: FastifyInstance,
    _options: FastifyPluginOptions,
    next: () => void,
): void {
    server.get('/', PUBLIC, version);

    // auth
    server.post('/logout', SECRET, logout);
    server.post<{ Body: { credential: string } }>('/google-verify', PUBLIC, googleVerify)

    // exchange rates
    server.get('/exchange-rates', SECRET, listExchangeRates);
    server.get('/exchange-rates/latest', SECRET, latestExchangeRate);
    server.post('/sync-exchange-rates', SECRET, syncExchangeRate);

    // company
    server.get('/company', SECRET, getCompany);
    server.put<PutCompanyBody>('/company', SECRET, putCompany);

    next();
}
