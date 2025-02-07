import {FastifyReply, FastifyRequest} from "fastify";
import {OAuth2Client} from 'google-auth-library';
import {prisma} from '../../db';
import {tokenizeUser} from "../../helpers/tokenize";
import {defaultUserInput} from "../../helpers/defaultUserInput";
import {config} from "../../config";

export const googleVerify = async (
    req: FastifyRequest<{ Body: { credential: string } }>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    try {
        console.log("credential", req.body.credential);
        const client = new OAuth2Client({
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET
        });
        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: config.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        console.log("payload", payload);
        if (!payload) throw new Error(`No payload`);
        if (!payload.email) throw new Error(`User without email`)

        let user = await prisma.users.findUnique({
            where: {
                email: payload.email
            }
        })

        if (!user) {
            const companyName = `Company of ${payload.name ?? payload.family_name ?? payload.given_name ?? payload.email}`;
            const company = await prisma.companies.create({
                data: {
                    name: companyName
                },
            })

            user = await prisma.users.create({
                data: defaultUserInput(payload.email, payload.name ?? '', company.id)
            })
        }

        if (user.avatar !== payload.picture && payload.picture) {
            user.avatar = payload.picture
            await prisma.users.update({
                where: {id: user.id},
                data: {avatar: payload.picture, lastVerifiedAt: new Date()}
            })
        } else {
            await prisma.users.update({
                where: {id: user.id},
                data: {lastVerifiedAt: new Date()}
            })
        }

        await prisma.accessLogs.create({
            data: {
                userId: user.id,
                createdAt: new Date(),
                ip: req.ip ?? '',
                agent: req.headers['user-agent'] ?? ''
            }
        })

        return reply.send({
            user: {
                id: user.id,
                email: user.email,
                avatar: user.avatar,
                full_name: user.full_name,
                roles: user.roles
            },
            token: tokenizeUser(user)
        });
    } catch (e) {
        console.log("err", e);
        throw e;
    }
}