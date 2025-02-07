import fastify, {
    type FastifyInstance,
    type FastifyReply,
    type FastifyRequest,
} from "fastify";
import {config} from "./config";
import indexRoute from "./routes/index.route";
import cors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import { FastifyRouteConfig } from 'fastify/types/route';

import { TokenPayload } from './types/auth';
import {verifyToken} from "./helpers/tokenize";
import {getErrorMessage} from "./helpers/getErrorMessage";

declare module 'fastify' {
    interface FastifyRequest {
        user: TokenPayload | null;
    }
}

function isPublic(config: FastifyRouteConfig): boolean {
    return (
        ('isPrivate' in config && !config.isPrivate) || !('isPrivate' in config)
    );
}

function isAdmin(config: FastifyRouteConfig): boolean {
    return Boolean(
        ('isAdmin' in config && config.isAdmin)
    );
}

export function getFastify(): FastifyInstance {
    const server = fastify({
        logger: config.NODE_ENV === 'development',
        bodyLimit: 100 * 1048576,
    });

    server.register(cors, {});
    server.register(fastifySensible);

    server.addHook(
        'onRequest',
        async (
            request: FastifyRequest<{ Headers: { authorization?: string } }>,
            reply: FastifyReply,
        ) => {
            // If the route is not private we ignore this hook
            if (isPublic(request.routeOptions.config)) {
                return;
            }

            const authHeader = request.headers.authorization;

            if (typeof authHeader !== 'string') {
                reply.unauthorized('No Authorization header');
                return;
            }

            const token: string = String(authHeader)
                .replace(/^Bearer\s+/, '')
                .trim();

            // If there is no header
            if (!token) {
                reply.unauthorized('Token is empty');
                return;
            }

            // Add the secret to the request object
            try {
                request.user = verifyToken(token);
            } catch (error) {
                return reply.unauthorized(getErrorMessage(error));
            }

            if (isAdmin(request.routeOptions.config) && !request.user.roles.includes('admin')) {
                return reply.unauthorized('You are not an admin');
            }
        },
    );

    server.register(indexRoute);

    return server;
}
