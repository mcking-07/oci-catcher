import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NtfyClient, OciClient } from '../../src/clients';
import { config } from '../../src/config';
import { OciRequestFailed } from '../../src/errors';
import { CatcherService } from '../../src/services';

const on_the_hour = new Date('2026-11-06T10:00:00Z');
const mid_hour = new Date('2026-11-06T10:05:00Z');

const capacity = (availabilityStatus: string) => [null, { shapeAvailabilities: [{ instanceShape: 'VM.Standard.A1.Flex', availabilityStatus }] }];

const failure = (message: string, status: number, service_code: string) => [new OciRequestFailed(message, { status, service_code, request_id: 'req' }), null];

const build = () => {
  const oci = {
    list_instances: vi.fn().mockResolvedValue([null, []]),
    create_capacity_report: vi.fn().mockResolvedValue(capacity('OUT_OF_HOST_CAPACITY')),
    launch_instance: vi.fn().mockResolvedValue([null, { id: 'ocid1.instance.oc1..new' }]),
  };
  const ntfy = { publish: vi.fn().mockResolvedValue([null, undefined]) };

  return { oci, ntfy, catcher: new CatcherService(oci as unknown as OciClient, ntfy as unknown as NtfyClient) };
};

describe('CatcherService', () => {
  let subject: ReturnType<typeof build>;
  beforeEach(() => {
    subject = build();
  });

  it('does nothing once the instance exists', async () => {
    subject.oci.list_instances.mockResolvedValue([null, [{ id: 'ocid1.instance.oc1..old', lifecycleState: 'RUNNING' }]]);

    await expect(subject.catcher.run(mid_hour)).resolves.toEqual({ status: 'exists', instance_id: 'ocid1.instance.oc1..old', lifecycle_state: 'RUNNING' });
    expect(subject.oci.list_instances).toHaveBeenCalledWith(config.oci.compartment_id, 'instance-1');
    expect(subject.oci.create_capacity_report).not.toHaveBeenCalled();
    expect(subject.ntfy.publish).not.toHaveBeenCalled();
  });

  it('ignores terminated instances with the same name', async () => {
    subject.oci.list_instances.mockResolvedValue([null, [{ id: 'ocid1.instance.oc1..gone', lifecycleState: 'TERMINATED' }]]);

    await expect(subject.catcher.run(mid_hour)).resolves.toEqual({ status: 'unavailable', availability: 'OUT_OF_HOST_CAPACITY' });
  });

  it('checks capacity in the root compartment and stays quiet when there is none', async () => {
    await expect(subject.catcher.run(on_the_hour)).resolves.toEqual({ status: 'unavailable', availability: 'OUT_OF_HOST_CAPACITY' });
    expect(subject.oci.create_capacity_report).toHaveBeenCalledWith({ tenancy_id: config.oci.tenancy_id, availability_domain: config.oci.availability_domain, shape: 'VM.Standard.A1.Flex', ocpus: 2, memory_gbs: 12 });
    expect(subject.oci.launch_instance).not.toHaveBeenCalled();
    expect(subject.ntfy.publish).not.toHaveBeenCalled();
  });

  it('launches with the configured settings and notifies when capacity is available', async () => {
    subject.oci.create_capacity_report.mockResolvedValue(capacity('AVAILABLE'));

    await expect(subject.catcher.run(mid_hour)).resolves.toEqual({ status: 'launched', instance_id: 'ocid1.instance.oc1..new' });
    expect(subject.oci.launch_instance).toHaveBeenCalledWith({
      availabilityDomain: config.oci.availability_domain,
      compartmentId: config.oci.compartment_id,
      displayName: 'instance-1',
      shape: 'VM.Standard.A1.Flex',
      shapeConfig: { ocpus: 2, memoryInGBs: 12 },
      sourceDetails: { sourceType: 'image', imageId: config.oci.image_id, bootVolumeSizeInGBs: 50 },
      createVnicDetails: { subnetId: config.oci.subnet_id, assignPublicIp: true, hostnameLabel: 'instance-1' },
      metadata: { ssh_authorized_keys: 'ssh-ed25519 AAAA test' },
      freeformTags: { environment: 'test' },
    }, `instance-1-${mid_hour.getTime()}`);
    expect(subject.ntfy.publish).toHaveBeenCalledWith(expect.objectContaining({ title: 'instance-1 launched', priority: 'urgent' }));
  });

  it('keeps retrying quietly when capacity disappears before the launch', async () => {
    subject.oci.create_capacity_report.mockResolvedValue(capacity('AVAILABLE'));
    subject.oci.launch_instance.mockResolvedValue(failure('Out of host capacity.', 500, 'InternalError'));

    await expect(subject.catcher.run(on_the_hour)).resolves.toMatchObject({ status: 'retrying' });
    expect(subject.ntfy.publish).not.toHaveBeenCalled();
  });

  it('treats throttling as retryable', async () => {
    subject.oci.list_instances.mockResolvedValue(failure('Too many requests', 429, 'TooManyRequests'));

    await expect(subject.catcher.run(on_the_hour)).resolves.toMatchObject({ status: 'retrying' });
    expect(subject.ntfy.publish).not.toHaveBeenCalled();
  });

  it('reports hard failures only on the hour', async () => {
    subject.oci.list_instances.mockResolvedValue(failure('Authorization failed or requested resource not found.', 404, 'NotAuthorizedOrNotFound'));

    await expect(subject.catcher.run(mid_hour)).resolves.toEqual({ status: 'failed', reason: '[404] [NotAuthorizedOrNotFound] Authorization failed or requested resource not found.' });
    expect(subject.ntfy.publish).not.toHaveBeenCalled();

    await subject.catcher.run(on_the_hour);
    expect(subject.ntfy.publish).toHaveBeenCalledWith(expect.objectContaining({ title: 'oci-catcher failed', priority: 'high' }));
  });

  it('fails the run when the notification cannot be sent', async () => {
    subject.oci.create_capacity_report.mockResolvedValue(capacity('AVAILABLE'));
    subject.ntfy.publish.mockResolvedValue([new Error('ntfy down'), null]);

    await expect(subject.catcher.run(mid_hour)).rejects.toThrow('ntfy down');
  });
});
