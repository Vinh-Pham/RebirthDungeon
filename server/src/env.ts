import type { Job } from './queues/schemas.js';
import type { AuthSession } from './auth/auth.js';
import type { AuthBindings } from './auth/config.js';

export type AppEnv = {
  Bindings: Omit<CloudflareBindings, 'APP_QUEUE' | keyof AuthBindings> &
    AuthBindings & { APP_QUEUE: Queue<Job> };
  Variables: {
    user: AuthSession['user'];
    sessionId: string;
    requestId: string;
    auditReplay?: boolean;
    auditContext?: {
      commandId: string;
      type: string;
      expectedRevision?: number;
    };
  };
};
