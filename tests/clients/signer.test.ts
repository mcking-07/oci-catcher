import { describe, expect, it } from 'vitest';
import { OciSigner } from '../../src/clients';
import { sha256 } from '../../src/common';
import { config } from '../../src/config';
import { keypair, verify } from '../setup';

const date = new Date('2014-01-05T21:31:40Z');

const parse = (authorization: string) => Object.fromEntries([...authorization.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));

const signer_for = (private_key: string) => new OciSigner({ ...config.oci, tenancy_id: 'ocid1.tenancy.oc1..t', user_id: 'ocid1.user.oc1..u', fingerprint: '20:3b:97', private_key });

describe('OciSigner', () => {
  it('signs get requests over x-date, (request-target) and host', async () => {
    const { pem, public_key } = await keypair();
    const url = new URL('https://iaas.us-phoenix-1.oraclecloud.com/20160918/instances?availabilityDomain=Pjwf%3A%20PHX-AD-1&displayName=TeamXInstances');

    const headers = await signer_for(pem).headers({ method: 'GET', url }, date);
    const authorization = parse(headers.authorization ?? '');

    expect(headers['x-date']).toBe('Sun, 05 Jan 2014 21:31:40 GMT');
    expect(headers).not.toHaveProperty('content-length');
    expect(authorization).toMatchObject({ version: '1', keyId: 'ocid1.tenancy.oc1..t/ocid1.user.oc1..u/20:3b:97', algorithm: 'rsa-sha256', headers: 'x-date (request-target) host' });

    const signing_string = [
      'x-date: Sun, 05 Jan 2014 21:31:40 GMT',
      '(request-target): get /20160918/instances?availabilityDomain=Pjwf%3A%20PHX-AD-1&displayName=TeamXInstances',
      'host: iaas.us-phoenix-1.oraclecloud.com',
    ].join('\n');
    await expect(verify(public_key, authorization.signature ?? '', signing_string)).resolves.toBe(true);
  });

  it('signs post requests over the body headers too', async () => {
    const { pem, public_key } = await keypair();
    const url = new URL('https://iaas.us-phoenix-1.oraclecloud.com/20160918/instances');
    const body = JSON.stringify({ displayName: 'instance-1' });

    const headers = await signer_for(pem).headers({ method: 'POST', url, body }, date);
    const authorization = parse(headers.authorization ?? '');
    const digest = await sha256(body);

    expect(headers).toMatchObject({ 'content-length': String(body.length), 'content-type': 'application/json', 'x-content-sha256': digest });
    expect(authorization.headers).toBe('x-date (request-target) host content-length content-type x-content-sha256');

    const signing_string = [
      'x-date: Sun, 05 Jan 2014 21:31:40 GMT',
      '(request-target): post /20160918/instances',
      'host: iaas.us-phoenix-1.oraclecloud.com',
      `content-length: ${body.length}`,
      'content-type: application/json',
      `x-content-sha256: ${digest}`,
    ].join('\n');
    await expect(verify(public_key, authorization.signature ?? '', signing_string)).resolves.toBe(true);
  });
});
