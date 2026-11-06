import { BaseError } from './base-error';
import type { ErrorPayloadType } from '../types';

class ValidationFailed extends BaseError {
  constructor(message: string, payload?: ErrorPayloadType) {
    super(message, 'VALIDATION_FAILED', payload);
  }
}

export { ValidationFailed };
