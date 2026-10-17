import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";
import {publicCompany} from "../../helpers/publicCompany";

const PutCompanySchema = z.object({
    name: z.string().min(1),
    tin: z.string(),
    address: z.string(),
    info: z.string(),
    logo: z.string(),
    signature: z.string(),
    country: z.enum(['GE', 'PL']),
    ksefEnv: z.enum(['test', 'prod']).nullable(),
    vatExemptionBasis: z.string(),
}).partial();

export type PutCompanyBody = { Body: z.infer<typeof PutCompanySchema> };

export const putCompany = async (
    req: FastifyRequest<PutCompanyBody>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const current = await prisma.companies.findUnique({where: {id: req.companyId}});
    if (!current) return reply.notFound('No company');

    const body = PutCompanySchema.parse(req.body);
    const country = body.country ?? current.country;
    const ksefEnv = country === 'PL' ? (body.ksefEnv === undefined ? current.ksefEnv : body.ksefEnv) : null;
    const tin = body.tin ?? current.tin;

    // a token belongs to one environment and one NIP, any change invalidates it
    const tokenStillValid = ksefEnv === current.ksefEnv && tin === current.tin;

    const company = await prisma.companies.update({
        where: {id: req.companyId},
        data: {
            ...body,
            country,
            ksefEnv,
            ...(tokenStillValid ? {} : {ksefTokenEnc: null}),
        },
    });

    return reply.send(publicCompany(company));
}
