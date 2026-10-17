import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";
import {publicCompany} from "../../helpers/publicCompany";

const NewCompanySchema = z.object({
    name: z.string().min(1),
    country: z.enum(['GE', 'PL']),
});

export type AddCompanyRoute = { Body: z.infer<typeof NewCompanySchema> };

export const addCompany = async (
    req: FastifyRequest<AddCompanyRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    if (!req.user) return reply.unauthorized();

    const body = NewCompanySchema.parse(req.body);
    const company = await prisma.companies.create({data: body});

    await prisma.users.update({
        where: {id: req.user.id},
        data: {companyIds: {push: company.id}},
    });

    return reply.send(publicCompany(company));
}
