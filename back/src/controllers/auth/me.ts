import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";

// the signed-in person: what the app shows about them and what they keep for themselves (e.g. their e-Delivery address)
const publicUser = ({id, email, full_name, avatar, roles, eDeliveryAddress}: {
    id: string, email: string, full_name: string, avatar: string, roles: string[], eDeliveryAddress: string
}) => ({id, email, full_name, avatar, roles, eDeliveryAddress});

export const getMe = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();
    const user = await prisma.users.findUnique({where: {id: req.user.id}});
    if (!user) return reply.notFound('No user');
    return reply.send(publicUser(user));
};

const PutMeSchema = z.object({eDeliveryAddress: z.string().trim()}).partial();

export type PutMeBody = { Body: z.infer<typeof PutMeSchema> };

export const putMe = async (req: FastifyRequest<PutMeBody>, reply: FastifyReply): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();
    const user = await prisma.users.update({where: {id: req.user.id}, data: PutMeSchema.parse(req.body)});
    return reply.send(publicUser(user));
};
