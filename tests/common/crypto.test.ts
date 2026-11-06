import { describe, expect, it } from 'vitest';
import { bytes, import_signing_key, sha256, sign } from '../../src/common';
import { keypair, verify } from '../setup';

describe('crypto', () => {
  it('hashes content as base64 sha-256 like x-content-sha256', async () => {
    await expect(sha256('')).resolves.toBe('47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
    await expect(sha256('{}')).resolves.toBe('RBNvo1WzZ4oRRq0W9+hknpT7T8If536DEMBg9hyq/4o=');
  });

  it('counts utf-8 bytes, not characters', () => {
    expect(bytes('instance')).toBe(8);
    expect(bytes('ü')).toBe(2);
  });

  it('signs with rsa-sha256 so the matching public key verifies it', async () => {
    const { pem, public_key } = await keypair();
    const signature = await sign(await import_signing_key(pem), 'signing string');

    await expect(verify(public_key, signature, 'signing string')).resolves.toBe(true);
    await expect(verify(public_key, signature, 'tampered string')).resolves.toBe(false);
  });
});
