import type { CampaignSnapshot } from './SaveSchema';
import type { SaveRepository } from './SaveRepository';
/** Retain immutable checkpoints at command boundaries, coalesce bursts, surface failures. */
export class AutoSaver {
  private pending?: CampaignSnapshot;
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  private inFlight?: Promise<void>;
  constructor(
    private repository: SaveRepository,
    private onError: (error: unknown) => void,
    private onSaved?: () => void,
  ) {}
  schedule(state: CampaignSnapshot) {
    if (this.closed) return;
    this.pending = state;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush().catch(this.onError);
    }, 250);
  }
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.inFlight) {
      await this.inFlight;
      return this.flush();
    }
    const state = this.pending;
    this.pending = undefined;
    if (state) {
      let writing: Promise<void> | undefined;
      try {
        writing = this.repository.save('auto', state);
        this.inFlight = writing;
        await writing;
        try {
          this.onSaved?.();
        } catch {
          /* Observation cannot reject a saved checkpoint. */
        }
      } catch (error) {
        if (!this.pending) this.pending = state;
        throw error;
      } finally {
        if (this.inFlight === writing) this.inFlight = undefined;
      }
    }
  }
  async dispose() {
    this.closed = true;
    await this.flush();
  }
}
