import {
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

export { s3, composeUrl, putObject };
