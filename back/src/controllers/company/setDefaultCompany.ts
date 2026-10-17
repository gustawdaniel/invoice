import {FastifyReply, FastifyRequest} from "fastify";
import {prisma} from "../../db";

export type SetDefaultCompanyRoute = { Params: { id: string } };

// the default company opens after login; the previous default stays one of the user's companies
export const setDefaultCompany = async (
    req: FastifyRequest<SetDefaultCompanyRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();

    const user = await prisma.users.findUnique({where: {id: req.user.id}});
    if (!user) return reply.unauthorized('No user');

    const id = req.params.id;
    if (id === user.companyId) return reply.send({defaultCompanyId: id});
    if (!user.companyIds.includes(id)) return reply.notFound('No such company of this user');

    await prisma.users.update({
        where: {id: user.id},
        data: {
            companyId: id,
            companyIds: [user.companyId, ...user.companyIds.filter(other => other !== id)],
        },
    });

    return reply.send({defaultCompanyId: id});
}
