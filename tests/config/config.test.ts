import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { bootstrap } from '../../src/config';
import { ValidationFailed } from '../../src/errors';
import type { EnvironmentType } from '../../src/types';

const base = env as unknown as EnvironmentType;

describe('config', () => {
  it('parses the settings into typed launch config', () => {
    const config = bootstrap(base);

    expect(config.environment).toBe('test');
    expect(config.oci.private_key).toBe('-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----');
    expect(config.instance).toMatchObject({ name: 'instance-1', ocpus: 2, memory_gbs: 12, boot_volume_gbs: 50, assign_public_ip: true, tags: { environment: 'test' } });
    expect(config.ntfy).toEqual({ url: 'https://ntfy.example.com', topic: 'oci-catcher-test' });
  });

  it('fails fast on a missing setting', () => {
    expect(() => bootstrap({ ...base, OCI_USER_ID: '' })).toThrow(new ValidationFailed('missing required config: OCI_USER_ID'));
  });

  it('rejects pkcs#1 keys, which web crypto cannot import', () => {
    expect(() => bootstrap({ ...base, OCI_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nx\n-----END RSA PRIVATE KEY-----' })).toThrow(/pkcs#8/);
  });

  it('rejects malformed numbers, booleans and tags', () => {
    expect(() => bootstrap({ ...base, INSTANCE_OCPUS: 'two' })).toThrow(/INSTANCE_OCPUS/);
    expect(() => bootstrap({ ...base, INSTANCE_ASSIGN_PUBLIC_IP: 'yes' })).toThrow(/INSTANCE_ASSIGN_PUBLIC_IP/);
    expect(() => bootstrap({ ...base, INSTANCE_TAGS: '["test"]' })).toThrow(/INSTANCE_TAGS/);
  });
});
