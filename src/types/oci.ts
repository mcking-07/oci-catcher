type OciMethodType = 'GET' | 'POST';

type OciRequestType = {
  method: OciMethodType;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

type OciSignableType = {
  method: OciMethodType;
  url: URL;
  body?: string;
};

type OciShapeRequestType = {
  tenancy_id: string;
  availability_domain: string;
  shape: string;
  ocpus: number;
  memory_gbs: number;
};

type OciErrorBodyType = {
  code?: string;
  message?: string;
};

type OciInstanceType = {
  id: string;
  displayName: string;
  lifecycleState: string;
  shape: string;
  timeCreated: string;
};

type OciAvailabilityStatusType = 'AVAILABLE' | 'OUT_OF_HOST_CAPACITY' | 'HARDWARE_NOT_SUPPORTED';

type OciCapacityReportType = {
  shapeAvailabilities: { instanceShape: string; availabilityStatus: OciAvailabilityStatusType; availableCount?: number }[];
};

type OciLaunchDetailsType = {
  availabilityDomain: string;
  compartmentId: string;
  displayName: string;
  shape: string;
  shapeConfig: { ocpus: number; memoryInGBs: number };
  sourceDetails: { sourceType: 'image'; imageId: string; bootVolumeSizeInGBs: number };
  createVnicDetails: { subnetId: string; assignPublicIp: boolean; hostnameLabel: string };
  metadata: { ssh_authorized_keys: string };
  freeformTags: Record<string, string>;
};

export type { OciAvailabilityStatusType, OciCapacityReportType, OciErrorBodyType, OciInstanceType, OciLaunchDetailsType, OciMethodType, OciRequestType, OciShapeRequestType, OciSignableType };
