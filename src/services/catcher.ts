import { loggerFor } from '../common';
import { config } from '../config';
import { OciRequestFailed } from '../errors';
import type { NtfyClient, OciClient } from '../clients';
import type { CatchOutcomeType, NotificationType, OciCapacityReportType, OciLaunchDetailsType, ShapeConfigType } from '../types';

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

const size_of = ({ ocpus, memory_gbs }: ShapeConfigType) => `${ocpus} ocpu / ${memory_gbs} gb`;

const availability_of = (report: OciCapacityReportType, { ocpus, memory_gbs }: ShapeConfigType): string => {
  const matches = report.shapeAvailabilities.filter(({ instanceShapeConfig }) => instanceShapeConfig?.ocpus === ocpus && instanceShapeConfig?.memoryInGBs === memory_gbs);

  return matches.find(({ availabilityStatus }) => availabilityStatus === 'AVAILABLE')?.availabilityStatus ?? matches[0]?.availabilityStatus ?? 'UNKNOWN';
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
    const { shape, shape_configs } = instance;

    const [report_error, report] = await this.oci.create_capacity_report({ tenancy_id, availability_domain, shape, shape_configs });
    if (report_error) return settle(report_error);

    const checks = shape_configs.map(shape_config => ({ shape_config, availability: availability_of(report, shape_config) }));
    const available = checks.find(({ availability }) => availability === 'AVAILABLE')?.shape_config;
    if (!available) return { status: 'unavailable', availability: checks.map(({ shape_config, availability }) => `${size_of(shape_config)}: ${availability}`).join(', ') };

    logger.info(`[~] capacity available for [${instance.name}] at [${size_of(available)}], launching`);
    const [launch_error, launched] = await this.oci.launch_instance(this.details(available), `${instance.name}-${scheduled.getTime()}`);
    if (launch_error) return settle(launch_error);

    return { status: 'launched', instance_id: launched.id, ...available };
  };

  private details = ({ ocpus, memory_gbs }: ShapeConfigType): OciLaunchDetailsType => {
    const { oci, instance } = config;

    return {
      availabilityDomain: oci.availability_domain,
      compartmentId: oci.compartment_id,
      displayName: instance.name,
      shape: instance.shape,
      shapeConfig: { ocpus, memoryInGBs: memory_gbs },
      sourceDetails: { sourceType: 'image', imageId: oci.image_id, bootVolumeSizeInGBs: instance.boot_volume_gbs },
      createVnicDetails: { subnetId: oci.subnet_id, assignPublicIp: instance.assign_public_ip, hostnameLabel: instance.hostname },
      metadata: { ssh_authorized_keys: instance.ssh_public_key },
      freeformTags: instance.tags,
    };
  };

  private notification = (outcome: CatchOutcomeType, scheduled: Date): NotificationType | null => {
    const { name, shape } = config.instance;

    if (outcome.status === 'launched') {
      return { title: `${name} launched`, message: `${shape} ${size_of(outcome)} is provisioning: ${outcome.instance_id}`, priority: 'urgent', tags: ['tada'] };
    }

    if (outcome.status === 'failed' && scheduled.getUTCMinutes() === 0) return { title: 'oci-catcher failed', message: outcome.reason, priority: 'high', tags: ['warning'] };

    return null;
  };
}

export { CatcherService };
