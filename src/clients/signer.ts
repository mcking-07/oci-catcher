import { bytes, import_signing_key, sha256, sign } from '../common';
import type { OciConfigType, OciSignableType } from '../types';

class OciSigner {
  private readonly key_id: string;
  private readonly private_key: string;
  private key?: Promise<CryptoKey>;
  constructor({ tenancy_id, user_id, fingerprint, private_key }: OciConfigType) {
    this.key_id = `${tenancy_id}/${user_id}/${fingerprint}`;
    this.private_key = private_key;
  }

  headers = async ({ method, url, body }: OciSignableType, date = new Date()) => {
    const signed: [string, string][] = [
      ['x-date', date.toUTCString()],
      ['(request-target)', `${method.toLowerCase()} ${url.pathname}${url.search}`],
      ['host', url.host],
    ];

    if (body !== undefined) signed.push(['content-length', String(bytes(body))], ['content-type', 'application/json'], ['x-content-sha256', await sha256(body)]);

    this.key ??= import_signing_key(this.private_key);

    const signing_string = signed.map(([name, value]) => `${name}: ${value}`).join('\n');
    const signature = await sign(await this.key, signing_string);
    const names = signed.map(([name]) => name).join(' ');

    const headers: Record<string, string> = Object.fromEntries(signed.filter(([name]) => name !== '(request-target)' && name !== 'host'));
    headers.authorization = `Signature version="1",keyId="${this.key_id}",algorithm="rsa-sha256",headers="${names}",signature="${signature}"`;

    return headers;
  };
}

export { OciSigner };
