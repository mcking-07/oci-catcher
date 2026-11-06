import { AsyncLocalStorage } from 'node:async_hooks';
import type { ContextStoreType } from '../types';

const storage = new AsyncLocalStorage<ContextStoreType>();

const context_store = {
  get: () => storage.getStore(),
  run: <ResultType>(store: ContextStoreType, action: () => ResultType) => storage.run(store, action),
};

export { context_store };
