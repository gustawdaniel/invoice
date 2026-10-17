import {FastifyReply, FastifyRequest} from "fastify";
import {z} from "zod";
import {prisma} from "../../db";
import {publicCompany} from "../../helpers/publicCompany";
import {
    CONNECT_ENVS,
    type ConnectEnv,
    connectWithSignedRequest,
    createAuthRequest,
    tokenField,
    verifyUserToken,
} from "../../services/ksef/ksef";
import {encryptKsefToken} from "../../services/ksef/tokenCrypto";
import {getErrorMessage} from "../../helpers/getErrorMessage";

// every connection route is per environment: /company/ksef/prod/... (live mode) or /company/ksef/demo/... (test mode)
const EnvParams = z.object({env: z.enum(CONNECT_ENVS)});
export type KsefEnvRoute = { Params: { env: ConnectEnv } };

async function polishCompany(companyId: string) {
    const company = await prisma.companies.findUnique({where: {id: companyId}});
    if (!company) throw new Error('No company');
    if (company.country !== 'PL') throw new Error('KSeF is available only for Polish companies');
    return company;
}

async function saveToken(companyId: string, env: ConnectEnv, token: string | null) {
    const company = await prisma.companies.update({
        where: {id: companyId},
        data: {[tokenField(env)]: token === null ? null : encryptKsefToken(token)},
    });
    return publicCompany(company);
}

// Step 1 of the signature based connection: XML to be signed by the user (e.g. Profil Zaufany)
export const ksefAuthRequest = async (req: FastifyRequest<KsefEnvRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        const {env} = EnvParams.parse(req.params);
        const company = await polishCompany(req.companyId);
        const xml = await createAuthRequest(company, env);
        return reply
            .header('content-type', 'application/xml; charset=utf-8')
            .header('content-disposition', `attachment; filename="ksef-${env}-auth-request.xml"`)
            .send(xml);
    } catch (error) {
        req.log.error(error);
        return reply.badGateway(getErrorMessage(error));
    }
}

const SignedSchema = z.object({signedXml: z.string().min(1)});
export type KsefAuthSignedRoute = KsefEnvRoute & { Body: z.infer<typeof SignedSchema> };

// Step 2: authenticate with the signed XML and exchange it for a long-lived KSeF token
export const ksefAuthSigned = async (req: FastifyRequest<KsefAuthSignedRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        const {env} = EnvParams.parse(req.params);
        const company = await polishCompany(req.companyId);
        const {signedXml} = SignedSchema.parse(req.body);
        const token = await connectWithSignedRequest(env, signedXml);
        return reply.send(await saveToken(company.id, env, token));
    } catch (error) {
        req.log.error(error);
        return reply.badGateway(getErrorMessage(error));
    }
}

const TokenSchema = z.object({token: z.string().min(1)});
export type KsefTokenRoute = KsefEnvRoute & { Body: z.infer<typeof TokenSchema> };

// token pasted by the user, generated in Aplikacja Podatnika KSeF of that environment
export const connectKsefWithToken = async (req: FastifyRequest<KsefTokenRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    try {
        const {env} = EnvParams.parse(req.params);
        const company = await polishCompany(req.companyId);
        const {token} = TokenSchema.parse(req.body);
        const verified = await verifyUserToken(company, env, token);
        return reply.send(await saveToken(company.id, env, verified));
    } catch (error) {
        req.log.error(error);
        return reply.badGateway(getErrorMessage(error));
    }
}

export const disconnectKsef = async (req: FastifyRequest<KsefEnvRoute>, reply: FastifyReply): Promise<FastifyReply> => {
    const {env} = EnvParams.parse(req.params);
    return reply.send(await saveToken(req.companyId, env, null));
}
