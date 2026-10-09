// Which pointer draws (interface.md §4): one at a time, and palm rejection for pens. Pure: the
// canvas component feeds it the pointer events.

export interface PointerInput {
  readonly pointerId: number;
  /** `PointerEvent.pointerType`: 'mouse', 'pen', 'touch' or anything a browser invents. */
  readonly pointerType: string;
}

/**
 * `start`: begin a stroke with this pointer. `replace`: drop the stroke in progress (a palm that
 * touched first) and begin one with this pen. `ignore`: not this pointer.
 */
export type PointerDownDecision = 'start' | 'replace' | 'ignore';

export class PointerPolicy {
  private active: PointerInput | null = null;

  down(pointer: PointerInput): PointerDownDecision {
    if (this.active === null) {
      this.active = pointer;
      return 'start';
    }
    if (this.active.pointerType === 'touch' && pointer.pointerType === 'pen') {
      this.active = pointer;
      return 'replace';
    }
    return 'ignore';
  }

  /** Whether moves of this pointer extend the stroke in progress. */
  owns(pointer: PointerInput): boolean {
    return this.active?.pointerId === pointer.pointerId;
  }

  /** `pointerup` or `pointercancel`; true when it ends the stroke in progress. */
  up(pointer: PointerInput): boolean {
    if (!this.owns(pointer)) {
      return false;
    }
    this.active = null;
    return true;
  }

  /** Forgets the stroke in progress (the editor got disabled mid-stroke). */
  reset(): void {
    this.active = null;
  }
}
