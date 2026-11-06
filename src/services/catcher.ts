import { loggerFor } from '../common';
import { config } from '../config';
import { OciRequestFailed } from '../errors';
import type { NtfyClient, OciClient } from '../clients';
import type { CatchOutcomeType, NotificationType, OciLaunchDetailsType } from '../types';

const logger = loggerFor('services/catcher');

const GONE_STATES = new Set(['TERMINATING', 'TERMINATED']);
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const settle = (error: Error): CatchOutcomeType => {
  if (!(error instanceof OciRequestFailed)) return { status: 'failed', reason: error.message };

  const { status, service_code } = error.payload;
  const reason = `[${status}] [${service_code}] ${error.message}`;
  const retryable = RETRYABLE_STATUSES.has(Number(status)) || /out of (host )?capacity/i.test(error.message);

  return retryable ? { status: 'retrying', reason } : { status: 'failed', reason };
};

class CatcherService {
  private readonly oci: OciClient;
  private readonly ntfy: NtfyClient;
  constructor(oci: OciClient, ntfy: NtfyClient) {
    this.oci = oci;
    this.ntfy = ntfy;
  }

  run = async (scheduled: Date) => {
    const outcome = await this.attempt(scheduled);

    const log = outcome.status === 'failed' ? logger.error : logger.info;
    log(`[${outcome.status === 'launched' ? '+' : '~'}] ${config.instance.name}: ${outcome.status}`, outcome);

    const notification = this.notification(outcome, scheduled);
    if (!notification) return outcome;

    const [error] = await this.ntfy.publish(notification);
    if (error) throw error;

    return outcome;
  };

  private attempt = async (scheduled: Date): Promise<CatchOutcomeType> => {
    const { oci, instance } = config;

    const [list_error, instances] = await this.oci.list_instances(oci.compartment_id, instance.name);
    if (list_error) return settle(list_error);

    const existing = instances.find(({ lifecycleState }) => !GONE_STATES.has(lifecycleState));
    if (existing) return { status: 'exists', instance_id: existing.id, lifecycle_state: existing.lifecycleState };

    const { tenancy_id, availability_domain } = oci;
    const { shape, ocpus, memory_gbs } = instance;

    const [report_error, report] = await this.oci.create_capacity_report({ tenancy_id, availability_domain, shape, ocpus, memory_gbs });
    if (report_error) return settle(report_error);

    const availability = report.shapeAvailabilities[0]?.availabilityStatus ?? 'UNKNOWN';
    if (availability !== 'AVAILABLE') return { status: 'unavailable', availability };

    logger.info(`[~] capacity available for [${instance.name}], launching`);
    const [launch_error, launched] = await this.oci.launch_instance(this.details(), `${instance.name}-${scheduled.getTime()}`);
    if (launch_error) return settle(launch_error);

    return { status: 'launched', instance_id: launched.id };
  };

  private details = (): OciLaunchDetailsType => {
    const { oci, instance } = config;

    return {
      availabilityDomain: oci.availability_domain,
      compartmentId: oci.compartment_id,
      displayName: instance.name,
      shape: instance.shape,
      shapeConfig: { ocpus: instance.ocpus, memoryInGBs: instance.memory_gbs },
      sourceDetails: { sourceType: 'image', imageId: oci.image_id, bootVolumeSizeInGBs: instance.boot_volume_gbs },
      createVnicDetails: { subnetId: oci.subnet_id, assignPublicIp: instance.assign_public_ip, hostnameLabel: instance.hostname },
      metadata: { ssh_authorized_keys: instance.ssh_public_key },
      freeformTags: instance.tags,
    };
  };

  private notification = (outcome: CatchOutcomeType, scheduled: Date): NotificationType | null => {
    const { name, shape, ocpus, memory_gbs } = config.instance;

    if (outcome.status === 'launched') {
      return { title: `${name} launched`, message: `${shape} ${ocpus} ocpu / ${memory_gbs} gb is provisioning: ${outcome.instance_id}`, priority: 'urgent', tags: ['tada'] };
    }

    if (outcome.status === 'failed' && scheduled.getUTCMinutes() === 0) return { title: 'oci-catcher failed', message: outcome.reason, priority: 'high', tags: ['warning'] };

    return null;
  };
}

export { CatcherService };
