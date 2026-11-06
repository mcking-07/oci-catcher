import { ValidationFailed } from '../errors';
import type { ConfigType, EnvironmentType } from '../types';

const config = {} as ConfigType;

const required = (value: unknown, key: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationFailed(`missing required config: ${key}`);

  return value.trim();
};

const positive = (value: unknown, key: string): number => {
  const parsed = Number(required(value, key));
  if (!Number.isFinite(parsed) || parsed <= 0) throw new ValidationFailed(`config ${key} must be a positive number`);

  return parsed;
};

const boolean = (value: unknown, key: string): boolean => {
  const parsed = required(value, key);
  if (parsed !== 'true' && parsed !== 'false') throw new ValidationFailed(`config ${key} must be true or false`);

  return parsed === 'true';
};

const tags = (value: unknown, key: string): Record<string, string> => {
  const parsed: unknown = JSON.parse(required(value, key));
  const valid = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) && Object.values(parsed).every(tag => typeof tag === 'string');
  if (!valid) throw new ValidationFailed(`config ${key} must be a json object of strings`);

  return parsed as Record<string, string>;
};

const private_key = (value: unknown, key: string): string => {
  const pem = required(value, key).replace(/\\n/g, '\n');
  if (!pem.includes('-----BEGIN PRIVATE KEY-----')) throw new ValidationFailed(`config ${key} must be a pkcs#8 pem (BEGIN PRIVATE KEY)`);

  return pem;
};

const bootstrap = (env: EnvironmentType) => {
  Object.assign(config, {
    environment: env.NODE_ENV ?? 'development',
    oci: {
      region: required(env.OCI_REGION, 'OCI_REGION'),
      tenancy_id: required(env.OCI_TENANCY_ID, 'OCI_TENANCY_ID'),
      user_id: required(env.OCI_USER_ID, 'OCI_USER_ID'),
      fingerprint: required(env.OCI_FINGERPRINT, 'OCI_FINGERPRINT'),
      private_key: private_key(env.OCI_PRIVATE_KEY, 'OCI_PRIVATE_KEY'),
      compartment_id: required(env.OCI_COMPARTMENT_ID, 'OCI_COMPARTMENT_ID'),
      availability_domain: required(env.OCI_AVAILABILITY_DOMAIN, 'OCI_AVAILABILITY_DOMAIN'),
      subnet_id: required(env.OCI_SUBNET_ID, 'OCI_SUBNET_ID'),
      image_id: required(env.OCI_IMAGE_ID, 'OCI_IMAGE_ID'),
    },
    instance: {
      name: required(env.INSTANCE_NAME, 'INSTANCE_NAME'),
      hostname: required(env.INSTANCE_HOSTNAME, 'INSTANCE_HOSTNAME'),
      shape: required(env.INSTANCE_SHAPE, 'INSTANCE_SHAPE'),
      ocpus: positive(env.INSTANCE_OCPUS, 'INSTANCE_OCPUS'),
      memory_gbs: positive(env.INSTANCE_MEMORY_GBS, 'INSTANCE_MEMORY_GBS'),
      boot_volume_gbs: positive(env.INSTANCE_BOOT_VOLUME_GBS, 'INSTANCE_BOOT_VOLUME_GBS'),
      assign_public_ip: boolean(env.INSTANCE_ASSIGN_PUBLIC_IP, 'INSTANCE_ASSIGN_PUBLIC_IP'),
      tags: tags(env.INSTANCE_TAGS, 'INSTANCE_TAGS'),
      ssh_public_key: required(env.INSTANCE_SSH_PUBLIC_KEY, 'INSTANCE_SSH_PUBLIC_KEY'),
    },
    ntfy: {
      url: required(env.NTFY_URL, 'NTFY_URL').replace(/\/+$/, ''),
      topic: required(env.NTFY_TOPIC, 'NTFY_TOPIC'),
    },
  });

  return config;
};

export { bootstrap, config };
