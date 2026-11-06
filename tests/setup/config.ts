import { env } from 'cloudflare:workers';
import { bootstrap } from '../../src/config';
import type { EnvironmentType } from '../../src/types';

bootstrap(env as unknown as EnvironmentType);
