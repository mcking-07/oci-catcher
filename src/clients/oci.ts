import { loggerFor, safe } from '../common';
import { OciRequestFailed } from '../errors';
import type { OciSigner } from './signer';
import type { OciCapacityReportType, OciErrorBodyType, OciInstanceType, OciLaunchDetailsType, OciRequestType, OciShapeRequestType } from '../types';

const logger = loggerFor('clients/oci');

const API_VERSION = '20160918';

const encode = (query: Record<string, string> = {}) => {
  const pairs = Object.entries(query).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return pairs.length ? `?${pairs.join('&')}` : '';
};

class OciClient {
  private readonly endpoint: string;
  private readonly signer: OciSigner;
  constructor(region: string, signer: OciSigner) {
    this.endpoint = `https://iaas.${region}.oraclecloud.com/${API_VERSION}`;
    this.signer = signer;
  }

  private request = async <ResponseType>({ method, path, query, body, headers = {} }: OciRequestType) => {
    const url = new URL(`${this.endpoint}${path}${encode(query)}`);
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const signed = await this.signer.headers({ method, url, body: payload });

    const response = await fetch(url, { method, body: payload, headers: { accept: 'application/json', ...headers, ...signed } });
    const request_id = response.headers.get('opc-request-id');

    if (!response.ok) {
      const { code: service_code = 'Unknown', message = `oci request failed with status ${response.status}` } = await response.json().catch(() => ({})) as OciErrorBodyType;
      throw new OciRequestFailed(message, { method, path, status: response.status, service_code, request_id });
    }

    logger.debug(`[+] ${method} ${path} succeeded with [${response.status}]`, { request_id });
    return response.json() as Promise<ResponseType>;
  };

  list_instances = safe(async (compartment_id: string, display_name: string) => {
    return this.request<OciInstanceType[]>({ method: 'GET', path: '/instances', query: { compartmentId: compartment_id, displayName: display_name } });
  });

  create_capacity_report = safe(async ({ tenancy_id, availability_domain, shape, ocpus, memory_gbs }: OciShapeRequestType) => {
    return this.request<OciCapacityReportType>({
      method: 'POST',
      path: '/computeCapacityReports',
      body: {
        compartmentId: tenancy_id,
        availabilityDomain: availability_domain,
        shapeAvailabilities: [{ instanceShape: shape, instanceShapeConfig: { ocpus, memoryInGBs: memory_gbs } }],
      },
    });
  });

  launch_instance = safe(async (details: OciLaunchDetailsType, retry_token: string) => {
    return this.request<OciInstanceType>({ method: 'POST', path: '/instances', body: details, headers: { 'opc-retry-token': retry_token } });
  });
}

export { OciClient };
