type EnvironmentType = {
  NODE_ENV: string;
  NTFY_URL: string;
  NTFY_TOPIC: string;
  OCI_REGION: string;
  OCI_TENANCY_ID: string;
  OCI_USER_ID: string;
  OCI_FINGERPRINT: string;
  OCI_PRIVATE_KEY: string;
  OCI_COMPARTMENT_ID: string;
  OCI_AVAILABILITY_DOMAIN: string;
  OCI_SUBNET_ID: string;
  OCI_IMAGE_ID: string;
  INSTANCE_NAME: string;
  INSTANCE_HOSTNAME: string;
  INSTANCE_SHAPE: string;
  INSTANCE_OCPUS: string;
  INSTANCE_MEMORY_GBS: string;
  INSTANCE_BOOT_VOLUME_GBS: string;
  INSTANCE_ASSIGN_PUBLIC_IP: string;
  INSTANCE_TAGS: string;
  INSTANCE_SSH_PUBLIC_KEY: string;
};

export type { EnvironmentType };
