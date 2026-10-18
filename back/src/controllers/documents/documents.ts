import {FastifyReply, FastifyRequest} from 'fastify';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {prisma} from '../../db';
import {deleteObject, getObject, putPrivateObject} from '../../services/s3';
import {DOCUMENT_KINDS} from '../../services/documents/kinds';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const SELECT = {
    id: true,
    title: true,
    kind: true,
    url: true,
    storageKey: true,
    fileName: true,
    mimeType: true,
    size: true,
    note: true,
    createdAt: true,
    updatedAt: true,
} as const;

type DocumentRow = {
    id: string;
    title: string;
    kind: string;
    url: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    size: number;
    note: string;
    createdAt: Date;
    updatedAt: Date;
};

const publicDocument = ({storageKey, ...document}: DocumentRow) => ({
    ...document,
    hasFile: Boolean(storageKey),
});

const FileSchema = z.object({
    name: z.string().min(1).max(255),
    mime: z.string().min(1).max(120),
    // base64, optionally a data: URL from FileReader
    data: z.string().min(1),
});

const HttpUrl = z.string().url()
    .refine((value) => /^https?:\/\//i.test(value), 'Use an http(s) link')
    .or(z.literal(''));

const AddDocumentSchema = z.object({
    title: z.string().min(1).max(200),
    kind: z.enum(DOCUMENT_KINDS).default('other'),
    url: HttpUrl.default(''),
    note: z.string().max(5000).default(''),
    file: FileSchema.optional(),
});

export interface AddDocumentRoute {
    Body: z.infer<typeof AddDocumentSchema>;
}

const UpdateDocumentSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    kind: z.enum(DOCUMENT_KINDS).optional(),
    url: HttpUrl.optional(),
    note: z.string().max(5000).optional(),
});

export interface UpdateDocumentRoute {
    Params: { id: string };
    Body: z.infer<typeof UpdateDocumentSchema>;
}

export interface DocumentRoute {
    Params: { id: string };
}

function safeFileName(name: string): string {
    const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned.slice(0, 120) || 'document';
}

function decodeBase64(data: string): Buffer {
    return Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64');
}

export const listDocuments = async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const documents = await prisma.documents.findMany({
        where: {companyId: req.companyId},
        orderBy: [{createdAt: 'desc'}, {title: 'asc'}],
        select: SELECT,
    });
    return reply.send(documents.map(publicDocument));
};

export const addDocument = async (
    req: FastifyRequest<AddDocumentRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const body = AddDocumentSchema.parse(req.body);
    if (!body.file && !body.url) {
        return reply.badRequest('Add a file or an external link');
    }

    let storageKey = '';
    let fileName = '';
    let mimeType = '';
    let size = 0;

    if (body.file) {
        if (!ALLOWED_MIME.has(body.file.mime)) {
            return reply.badRequest('Only PDF, DOCX and images are supported');
        }
        const buffer = decodeBase64(body.file.data);
        if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
            return reply.badRequest('The file must be between 1 byte and 8 MB');
        }
        fileName = body.file.name;
        mimeType = body.file.mime;
        size = buffer.length;
        storageKey = `invoice/documents/${req.companyId}/${randomUUID()}-${safeFileName(fileName)}`;
        await putPrivateObject({
            Key: storageKey,
            Body: buffer,
            ContentType: mimeType,
            ContentLength: size,
        });
    }

    const document = await prisma.documents.create({
        data: {
            companyId: req.companyId,
            title: body.title,
            kind: body.kind,
            url: body.url,
            note: body.note,
            storageKey,
            fileName,
            mimeType,
            size,
        },
        select: SELECT,
    });
    return reply.send(publicDocument(document));
};

export const updateDocument = async (
    req: FastifyRequest<UpdateDocumentRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const body = UpdateDocumentSchema.parse(req.body);
    const current = await prisma.documents.findFirst({
        where: {id: req.params.id, companyId: req.companyId},
        select: SELECT,
    });
    if (!current) return reply.notFound('Document not found');
    if (!current.storageKey && !(body.url ?? current.url)) {
        return reply.badRequest('A document needs a file or an external link');
    }
    const document = await prisma.documents.update({
        where: {id: current.id},
        data: body,
        select: SELECT,
    });
    return reply.send(publicDocument(document));
};

export const deleteDocument = async (
    req: FastifyRequest<DocumentRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const document = await prisma.documents.findFirst({
        where: {id: req.params.id, companyId: req.companyId},
        select: {id: true, storageKey: true},
    });
    if (!document) return reply.notFound('Document not found');
    if (document.storageKey) await deleteObject(document.storageKey);
    await prisma.documents.delete({where: {id: document.id}});
    return reply.send({deleted: true});
};

export const downloadDocument = async (
    req: FastifyRequest<DocumentRoute>,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const document = await prisma.documents.findFirst({
        where: {id: req.params.id, companyId: req.companyId},
        select: {storageKey: true, fileName: true, mimeType: true, size: true},
    });
    if (!document || !document.storageKey) return reply.notFound('File not found');

    const object = await getObject(document.storageKey);
    if (!object.Body) return reply.notFound('File not found');
    const filename = encodeURIComponent(document.fileName || 'document');
    return reply
        .header('Content-Type', document.mimeType || 'application/octet-stream')
        .header('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${filename}`)
        .send(object.Body);
};
