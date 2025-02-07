import {FastifyReply, FastifyRequest} from "fastify";
import type {companies} from "@prisma/client";
import {prisma} from "../../db";

export type PutCompanyBody = {
    Body: Partial<Pick<companies, 'name' | 'address' | 'info' | 'logo' | 'signature'>>
};

export const putCompany = async (
    req: FastifyRequest<PutCompanyBody>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const companyId = req.user?.companyId;
    if(!companyId) return reply.unauthorized('No company');

    const body: PutCompanyBody['Body'] = {};

    if(req.body.name) body.name = req.body.name;
    if(req.body.address) body.address = req.body.address;
    if(req.body.info) body.info = req.body.info;
    if(req.body.logo) body.logo = req.body.logo;
    if(req.body.signature) body.signature = req.body.signature;

    const company = await prisma.companies.update({
        where: {
            id: companyId
        },
        data: body
    });

    if(!company) return reply.notFound('No company');

    return reply.send(company);
}