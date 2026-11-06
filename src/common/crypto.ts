const encoder = new TextEncoder();

const base64 = (bytes: ArrayBuffer | Uint8Array) => btoa(Array.from(new Uint8Array(bytes)).map(byte => String.fromCharCode(byte)).join(''));

const sha256 = async (input: string) => base64(await crypto.subtle.digest('SHA-256', encoder.encode(input)));

const pkcs8 = (pem: string) => {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(body), char => char.charCodeAt(0));

  return bytes.buffer;
};

const import_signing_key = (pem: string) => crypto.subtle.importKey('pkcs8', pkcs8(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);

const sign = async (key: CryptoKey, input: string) => base64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(input)));

const bytes = (input: string) => encoder.encode(input).byteLength;

export { base64, bytes, import_signing_key, sha256, sign };
