/**
 * Offside assistant-referee popup (Juggling/Referee pack, art review build). Pure presentation state: shown only for
 * a stoppage the rules engine already called as offside, once per call (stoppage identity), never for an offside
 * position alone. It never reads or writes referee state.
 */
export const OFFSIDE_POPUP = Object.freeze({ inMs: 220, maxMs: 2600 });

export interface PopupFrame {
  readonly visible: boolean;
  readonly alpha: number;
  /** 0 = in place, 1 = fully off to the side; always 0 with reduced motion (fade only). */
  readonly slide: number;
}
const HIDDEN: PopupFrame = { visible: false, alpha: 0, slide: 0 };

export class OffsidePopup<T extends { readonly reason: string } = { readonly reason: string }> {
  private call: T | null = null;
  private since = 0;
  private dismissed = false;
  /** Confirmed offside calls shown since the last reset. */
  shown = 0;

  update(stoppage: T | null, stopped: boolean, now: number, reducedMotion: boolean): PopupFrame {
    if (!stopped || !stoppage || stoppage.reason !== 'offside') return HIDDEN;
    if (stoppage !== this.call) {
      this.call = stoppage;
      this.since = now;
      this.dismissed = false;
      this.shown++;
    }
    const elapsed = now - this.since;
    if (this.dismissed || elapsed > OFFSIDE_POPUP.maxMs) return HIDDEN;
    const u = Math.min(1, Math.max(0, elapsed / OFFSIDE_POPUP.inMs));
    return { visible: true, alpha: u, slide: reducedMotion ? 0 : (1 - u) ** 3 };
  }

  dismiss(): void {
    if (this.call) this.dismissed = true;
  }

  /** New match, restart or scene shutdown: forget the call. */
  reset(): void {
    this.call = null;
    this.dismissed = false;
    this.since = 0;
    this.shown = 0;
  }
}
