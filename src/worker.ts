import { context_store } from './common';
import { bootstrap as bootstrap_config } from './config';
import { bootstrap as bootstrap_services, services } from './services';
import type { EnvironmentType } from './types';

const bootstrap = (env: EnvironmentType) => {
  bootstrap_config(env);
  bootstrap_services();

  return services.resolve('service:catcher');
};

export default {
  async scheduled(controller: ScheduledController, env: EnvironmentType, context: ExecutionContext): Promise<void> {
    const scheduled = new Date(controller.scheduledTime);
    const catcher = bootstrap(env);

    context.waitUntil(context_store.run({ run_id: scheduled.toISOString().slice(0, 16) }, () => catcher.run(scheduled)));
  },
};
