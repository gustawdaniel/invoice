import {FastifyReply, FastifyRequest} from "fastify";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {findAgentKey, looksLikeAgentKey} from "../../services/agents/agentKeys";
import {createMcpServer} from "../../services/agents/mcpServer";

// MCP endpoint for AI agents (stateless streamable HTTP). Authenticated only with agent keys
// ("Authorization: Bearer oi_..."), app login tokens are not accepted here.
export const mcp = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | void> => {
    if (req.method !== 'POST') {
        return reply.code(405).header('allow', 'POST').send({error: 'Use POST, this MCP server is stateless'});
    }

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim() ?? '';
    const key = looksLikeAgentKey(token) ? await findAgentKey(token) : null;
    if (!key) {
        return reply.code(401).send({error: 'Agent key required: Authorization: Bearer oi_... (create one in the app settings)'});
    }

    const server = createMcpServer({user: key.user, keyName: key.name});
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    reply.raw.on('close', () => {
        void transport.close();
        void server.close();
    });

    await server.connect(transport);
    reply.hijack();
    await transport.handleRequest(req.raw, reply.raw, req.body);
};
