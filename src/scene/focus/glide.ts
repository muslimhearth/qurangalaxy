import { easeInOutCubic } from '../intro/timeline';

/**
 * Animated star positions. Every star rests at its home (galaxy) position until it gets a target;
 * then it glides there, and glides home again once it is no longer targeted. A new set of
 * targets starts a new glide from wherever the stars are. Only targeted or travelling stars are
 * touched, and `step` allocates nothing, so a frame costs a few dozen stars.
 */
export class Glide {
  /** Current position of every star (3 floats per star). Starts as a copy of the home positions. */
  readonly positions: Float32Array;
  /** Ids of the stars whose position changed in the last `step`; the first `movedCount` are valid. */
  readonly moved: Int32Array;
  /** Number of valid entries in `moved`. */
  movedCount = 0;
  private readonly home: Float32Array;
  private readonly from: Float32Array;
  private readonly to: Float32Array;
  /** Stars that are away from home or on their way. */
  private ids: number[] = [];
  /** Time of the first step of the current glide; null until that step. */
  private start: number | null = null;
  private running = false;

  /** `home`: 3 floats per star. `duration`: glide time in seconds; 0 jumps (reduced motion). */
  constructor(
    home: Float32Array,
    readonly duration: number,
  ) {
    this.home = home.slice();
    this.positions = home.slice();
    this.from = home.slice();
    this.to = home.slice();
    this.moved = new Int32Array(home.length / 3);
  }

  /** True while a glide is in progress (including one that waits for its first step). */
  get animating(): boolean {
    return this.running;
  }

  /**
   * Sends star `ids[k]` to `targets[k * 3 .. k * 3 + 2]`, and every other star that is away
   * back home. The glide starts at the next `step`.
   */
  setTargets(ids: readonly number[], targets: Float32Array): void {
    const all = [...new Set([...this.ids, ...ids])];
    for (const id of all) {
      for (let c = 0; c < 3; c++) {
        this.from[id * 3 + c] = this.positions[id * 3 + c]!;
        this.to[id * 3 + c] = this.home[id * 3 + c]!;
      }
    }
    ids.forEach((id, k) => this.to.set(targets.subarray(k * 3, k * 3 + 3), id * 3));
    this.ids = all;
    this.start = null;
    this.running = all.length > 0;
  }

  /** Moves the stars to their places at time `now` (seconds) and lists them in `moved`. */
  step(now: number): void {
    this.movedCount = 0;
    if (!this.running) return;
    this.start ??= now;
    const p = this.duration > 0 ? easeInOutCubic((now - this.start) / this.duration) : 1;
    const { positions, from, to, moved, ids } = this;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      for (let c = id * 3; c < id * 3 + 3; c++) positions[c] = from[c]! + (to[c]! - from[c]!) * p;
      moved[this.movedCount++] = id;
    }
    if (p >= 1) {
      this.running = false;
      // Stars back home need no more tracking.
      this.ids = ids.filter((id) => !this.isHome(id));
    }
  }

  private isHome(id: number): boolean {
    const b = id * 3;
    return this.to[b] === this.home[b] && this.to[b + 1] === this.home[b + 1] && this.to[b + 2] === this.home[b + 2];
  }
}
