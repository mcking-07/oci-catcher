type ErrorCodeType = 'NOTIFICATION_FAILED' | 'OCI_REQUEST_FAILED' | 'SERVICE_NOT_REGISTERED' | 'VALIDATION_FAILED';

type ErrorPayloadType = Record<string, unknown>;

export type { ErrorCodeType, ErrorPayloadType };
