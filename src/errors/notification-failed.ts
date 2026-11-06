import { BaseError } from './base-error';
import type { ErrorPayloadType } from '../types';

class NotificationFailed extends BaseError {
  constructor(message: string, payload?: ErrorPayloadType) {
    super(message, 'NOTIFICATION_FAILED', payload);
  }
}

export { NotificationFailed };
