import { BaseError } from './base-error';
import type { ErrorPayloadType } from '../types';

class ServiceNotRegistered extends BaseError {
  constructor(message: string, payload?: ErrorPayloadType) {
    super(message, 'SERVICE_NOT_REGISTERED', payload);
  }
}

export { ServiceNotRegistered };
