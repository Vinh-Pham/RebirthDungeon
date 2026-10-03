import { z } from '@hono/zod-openapi';

// Application endpoints retain their error contract; Better Auth owns its own schemas.
export const errorSchema = z
  .object({
    statusCode: z.int(),
    message: z.string(),
    error: z.string(),
  })
  .openapi('ApiError');
