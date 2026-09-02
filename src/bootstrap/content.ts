/**
 * Composition root: the content repository implementation is chosen here and
 * injected into application code — nothing inward imports `src/data`.
 */

import { BundledContentRepository } from '@/data/content/bundled-content-repository';
import type { ContentRepository } from '@/application/ports/content-repository';

export const contentRepository: ContentRepository =
  new BundledContentRepository();
