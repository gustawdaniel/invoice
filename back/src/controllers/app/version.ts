import pJson from '../../../package.json';
import { FastifyReply, FastifyRequest } from 'fastify';

export const version = (_req: FastifyRequest, res: FastifyReply): void => {
    res.code(200).send({
        name: pJson.name,
        version: pJson.version,

    });
};
