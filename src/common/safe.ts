import { safe as wrapper } from 'safe-wrapper';
import { config } from '../config';
import { loggerFor } from './logger';

const logger = loggerFor('common/safe');

const default_transformer = (error: Error) => {
  if (config?.environment !== 'test') logger.error(`[!] safe: an error occurred: ${error.message ?? error}`);
  return error;
};

const safe = <ActionType extends (...args: Parameters<ActionType>) => ReturnType<ActionType>>(action: ActionType, types = [], transformer = default_transformer) => wrapper(action, types, transformer);

export { safe };
