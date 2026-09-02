/**
 * Port (game plan §15/§17): the application and domain layers depend on this
 * interface only; concrete storage/network implementations live in `src/data`
 * and are injected at bootstrap.
 */

import type { ContentCatalog } from '../../domain/content/catalog';

export interface ContentRepository {
  /**
   * Loads and validates the full content catalog. Implementations must
   * validate before returning and may cache the immutable result.
   */
  loadCatalog(): Promise<ContentCatalog>;
}
