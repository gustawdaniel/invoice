import fastify, { type FastifyInstance} from "fastify";
import {config} from "./config";
import indexRoute from "./routes/index.route";
import cors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';

import { TokenPayload } from './types/auth';

declare module 'fastify' {
    interface FastifyRequest {
        user: TokenPayload | null;
    }
}

export function getFastify(): FastifyInstance {
    const server = fastify({
        logger: config.NODE_ENV === 'development',
        bodyLimit: 100 * 1048576,
    });

    server.register(cors, {});
    server.register(fastifySensible);

    server.register(indexRoute);

    return server;
}
