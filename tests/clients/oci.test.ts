import { afterEach, describe, expect, it, vi } from 'vitest';
import { OciClient, type OciSigner } from '../../src/clients';
import { OciRequestFailed } from '../../src/errors';

const signer = { headers: vi.fn().mockResolvedValue({ authorization: 'Signature test', 'x-date': 'now' }) } as unknown as OciSigner;
const client = new OciClient('us-phoenix-1', signer);

const respond = (status: number, body: unknown) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'opc-request-id': 'req-1' } }));

describe('OciClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists instances by compartment and display name with an encoded query', async () => {
    const fetch = respond(200, []);

    await expect(client.list_instances('ocid1.compartment.oc1..c', 'my instance')).resolves.toEqual([null, []]);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://iaas.us-phoenix-1.oraclecloud.com/20160918/instances?compartmentId=ocid1.compartment.oc1..c&displayName=my%20instance');
    expect(init).toMatchObject({ method: 'GET', headers: { authorization: 'Signature test', accept: 'application/json' } });
  });

  it('sends the launch body that was signed, with the retry token', async () => {
    const fetch = respond(200, { id: 'ocid1.instance.oc1..new' });

    await expect(client.launch_instance({ displayName: 'instance-1' } as never, 'instance-1-1')).resolves.toEqual([null, { id: 'ocid1.instance.oc1..new' }]);
    const [, init] = fetch.mock.calls[0] ?? [];
    expect(init).toMatchObject({ method: 'POST', body: '{"displayName":"instance-1"}', headers: { 'opc-retry-token': 'instance-1-1' } });
    expect(signer.headers).toHaveBeenLastCalledWith(expect.objectContaining({ method: 'POST', body: '{"displayName":"instance-1"}' }));
  });

  it('returns oci error bodies as OciRequestFailed', async () => {
    respond(500, { code: 'InternalError', message: 'Out of host capacity.' });

    const [error] = await client.create_capacity_report({ tenancy_id: 't', availability_domain: 'ad', shape: 'shape', ocpus: 2, memory_gbs: 12 });
    expect(error).toBeInstanceOf(OciRequestFailed);
    expect(error).toMatchObject({ message: 'Out of host capacity.', payload: { method: 'POST', path: '/computeCapacityReports', status: 500, service_code: 'InternalError', request_id: 'req-1' } });
  });
});
