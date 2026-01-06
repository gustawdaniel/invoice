import {composeKey, composeUrl, putObject} from "../services/s3";

export async function cacheAvatar(userId: string, url: string): Promise<string> {
    const res = await fetch(url);

    console.log('res', res);

    const buffer = Buffer.from(await res.arrayBuffer());

    console.log('buffer', buffer);

    const key = composeKey({id: userId});

    console.log('key', key);

    await putObject({
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
    })

    return composeUrl(key)
}