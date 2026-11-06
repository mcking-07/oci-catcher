type OciConfigType = {
  region: string;
  tenancy_id: string;
  user_id: string;
  fingerprint: string;
  private_key: string;
  compartment_id: string;
  availability_domain: string;
  subnet_id: string;
  image_id: string;
};

type InstanceConfigType = {
  name: string;
  hostname: string;
  shape: string;
  ocpus: number;
  memory_gbs: number;
  boot_volume_gbs: number;
  assign_public_ip: boolean;
  tags: Record<string, string>;
  ssh_public_key: string;
};

type NtfyConfigType = {
  url: string;
  topic: string;
};

type ConfigType = {
  environment: string;
  oci: OciConfigType;
  instance: InstanceConfigType;
  ntfy: NtfyConfigType;
};

export type { ConfigType, InstanceConfigType, NtfyConfigType, OciConfigType };
