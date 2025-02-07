import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../db';
import {getErrorMessage} from "../../helpers/getErrorMessage";

export const logout = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  try {
    if(!req.user) {
      return reply.code(204).send('');
    }

    await prisma.users.findUnique({
      where: {
        id: req.user.id,
      },
    });

    return reply.code(204).send('');
  } catch (error) {
    console.error(error);
    return reply.internalServerError(getErrorMessage(error));
  }
};
