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
    vatExemptionBasis: z.string(),
    defaultIssuePlace: z.string(),
    defaultIssuerName: z.string(),
    defaultBankAccountNumber: z.string(),
    defaultPublicNote: z.string(),
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
    const tin = body.tin ?? current.tin;

    // KSeF tokens belong to one NIP of a Polish company, a change invalidates both
    const tokensStillValid = country === 'PL' && tin === current.tin;

    const company = await prisma.companies.update({
        where: {id: req.companyId},
        data: {
            ...body,
            country,
            ...(tokensStillValid ? {} : {ksefTokenEnc: null, ksefDemoTokenEnc: null}),
        },
    });

    return reply.send(publicCompany(company));
}
