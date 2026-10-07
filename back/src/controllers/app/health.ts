import {FastifyReply, FastifyRequest} from 'fastify';
import {prisma} from '../../db';

// For uptime monitoring: 503 when the database is unreachable (e.g. a paused Atlas cluster).
// Public endpoint, so details go to the logs only.
export const health = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        await prisma.$runCommandRaw({ping: 1});
        return reply.send({status: 'ok', db: 'ok'});
    } catch (error) {
        req.log.error(error);
        console.error('health check: database unreachable', error);
        return reply.code(503).send({status: 'error', db: 'unreachable'});
    }
};
