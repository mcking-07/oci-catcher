import { base64 } from '../../src/common';

const keypair = async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  ) as CryptoKeyPair;

  const der = await crypto.subtle.exportKey('pkcs8', pair.privateKey) as ArrayBuffer;
  const lines = base64(der).match(/.{1,64}/g) ?? [];

  return { pem: `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`, public_key: pair.publicKey };
};

const verify = (public_key: CryptoKey, signature: string, input: string) => {
  const bytes = Uint8Array.from(atob(signature), char => char.charCodeAt(0));

  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', public_key, bytes, new TextEncoder().encode(input));
};

export { keypair, verify };
