import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";
import {publicCompany} from "../../helpers/publicCompany";
import {connectTestEnvironment, connectWithSignedRequest, createAuthRequest} from "../../services/ksef/ksef";
import {encryptKsefToken} from "../../services/ksef/tokenCrypto";
import {getErrorMessage} from "../../helpers/getErrorMessage";

async function polishCompany(companyId: string) {
    const company = await prisma.companies.findUnique({where: {id: companyId}});
    if (!company) throw new Error('No company');
    if (company.country !== 'PL') throw new Error('KSeF is available only for Polish companies');
    return company;
}

async function saveToken(companyId: string, token: string) {
    const company = await prisma.companies.update({
        where: {id: companyId},
        data: {ksefTokenEnc: encryptKsefToken(token)},
    });
    return publicCompany(company);
}

export const connectKsefTest = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        const company = await polishCompany(req.companyId);
        if (company.ksefEnv !== 'test') return reply.badRequest('Company is not in KSeF test mode');
        const token = await connectTestEnvironment(company);
        return reply.send(await saveToken(company.id, token));
    } catch (error) {
        req.log.error(error);
        return reply.badGateway(getErrorMessage(error));
    }
}

export const ksefProdAuthRequest = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        const company = await polishCompany(req.companyId);
        if (company.ksefEnv !== 'prod') return reply.badRequest('Company is not in KSeF production mode');
        const xml = await createAuthRequest(company, 'prod');
        return reply
            .header('content-type', 'application/xml; charset=utf-8')
            .header('content-disposition', 'attachment; filename="ksef-auth-request.xml"')
            .send(xml);
    } catch (error) {
        req.log.error(error);
        return reply.badGateway(getErrorMessage(error));
    }
}

const SignedSchema = z.object({signedXml: z.string().min(1)});
export type KsefProdAuthSignedRoute = { Body: z.infer<typeof SignedSchema> };

export const ksefProdAuthSigned = async (
    req: FastifyRequest<KsefProdAuthSignedRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    try {
        const company = await polishCompany(req.companyId);
        if (company.ksefEnv !== 'prod') return reply.badRequest('Company is not in KSeF production mode');
        const {signedXml} = SignedSchema.parse(req.body);
        const token = await connectWithSignedRequest('prod', signedXml);
        return reply.send(await saveToken(company.id, token));
    } catch (error) {
        req.log.error(error);
        return reply.badGateway(getErrorMessage(error));
    }
}

export const disconnectKsef = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const company = await prisma.companies.update({
        where: {id: req.companyId},
        data: {ksefTokenEnc: null},
    });
    return reply.send(publicCompany(company));
}
