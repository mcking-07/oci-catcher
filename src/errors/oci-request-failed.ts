import { BaseError } from './base-error';
import type { ErrorPayloadType } from '../types';

class OciRequestFailed extends BaseError {
  constructor(message: string, payload?: ErrorPayloadType) {
    super(message, 'OCI_REQUEST_FAILED', payload);
  }
}

export { OciRequestFailed };
