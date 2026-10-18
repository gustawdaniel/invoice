import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { config } from '../config';

const spacesEndpoint = new URL(`https://${config.SPACE_ENDPOINT}`).toString();

export function composeKey(path: { id: string }): string {
  const BASE_FOLDER = 'invoice';

  return `${BASE_FOLDER}/avatar/${path.id}.png`;
}

const composeUrl = (key: string): string =>
  `https://${config.SPACE_BUCKET}.${config.SPACE_ENDPOINT}/${key}`;

const s3 = new S3Client({
  forcePathStyle: false,
  region: config.SPACE_REGION,
  endpoint: spacesEndpoint,
  credentials: {
    accessKeyId: config.SPACE_ACCESS_KEY,
    secretAccessKey: config.SPACE_SECRET_KEY,
  },
});

const putObject = async (
  input: Omit<PutObjectCommandInput, 'Bucket'>,
): Promise<PutObjectCommandOutput> => {
  const command = new PutObjectCommand({
    ACL: 'public-read',
    Bucket: config.SPACE_BUCKET,
    ...input,
  });

  return s3.send(command);
};

// Company documents are private: no public-read ACL and no composeUrl. The API proxies
// downloads after checking that the user has access to the company.
const putPrivateObject = async (
  input: Omit<PutObjectCommandInput, 'Bucket' | 'ACL'>,
): Promise<PutObjectCommandOutput> => {
  return s3.send(new PutObjectCommand({Bucket: config.SPACE_BUCKET, ...input}));
};

const getObject = async (key: string): Promise<GetObjectCommandOutput> => {
  return s3.send(new GetObjectCommand({Bucket: config.SPACE_BUCKET, Key: key}));
};

const deleteObject = async (key: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({Bucket: config.SPACE_BUCKET, Key: key}));
};

export { s3, composeUrl, putObject, putPrivateObject, getObject, deleteObject };
