import { NtfyClient, OciClient, OciSigner } from '../clients';
import { loggerFor } from '../common';
import { config } from '../config';
import { ServiceNotRegistered } from '../errors';
import { CatcherService } from './catcher';

const logger = loggerFor('services/locator');

type RegistryType = {
  'client:signer': OciSigner;
  'client:oci': OciClient;
  'client:ntfy': NtfyClient;
  'service:catcher': CatcherService;
};

class ServiceRegistry {
  private readonly registry: Map<string, RegistryType[keyof RegistryType]>;
  private ready: boolean;
  constructor() {
    this.registry = new Map();
    this.ready = false;
  }

  register = <Key extends keyof RegistryType>(name: Key, instance: RegistryType[Key]) => {
    if (this.registry.has(name)) {
      logger.warn(`service [${name}] is already registered`);
    }

    this.registry.set(name, instance);
  };

  resolve = <Key extends keyof RegistryType>(name: Key) => {
    const service = this.registry.get(name);
    if (!service) throw new ServiceNotRegistered(`service [${name}] is not registered`, { service: name });

    return service as RegistryType[Key];
  };

  reset = () => {
    this.registry.clear();
    this.ready = false;
  };

  initialized = () => this.ready;

  seal = () => { this.ready = true; };
}

const services = new ServiceRegistry();

const bootstrap = () => {
  if (services.initialized()) return;

  services.register('client:signer', new OciSigner(config.oci));
  services.register('client:oci', new OciClient(config.oci.region, services.resolve('client:signer')));
  services.register('client:ntfy', new NtfyClient(config.ntfy));

  services.register('service:catcher', new CatcherService(services.resolve('client:oci'), services.resolve('client:ntfy')));

  services.seal();
};

export { bootstrap, services, ServiceRegistry };
