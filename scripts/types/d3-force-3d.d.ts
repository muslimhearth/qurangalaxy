/** Minimal types for the parts of d3-force-3d that the layout uses. The package ships no types. */
declare module 'd3-force-3d' {
  /** A simulation node. The simulation reads and writes position and velocity. */
  export interface SimNode {
    index?: number;
    x: number;
    y: number;
    z: number;
    vx?: number;
    vy?: number;
    vz?: number;
  }

  /** A link between two nodes, given by node index before initialization. */
  export interface SimLink<N extends SimNode> {
    source: number | N;
    target: number | N;
  }

  /** A force: called once per tick with the current alpha. */
  export interface Force<N extends SimNode> {
    (alpha: number): void;
    initialize?(nodes: N[], random: () => number, numDimensions: number): void;
  }

  export interface Simulation<N extends SimNode> {
    force(name: string, force: Force<N> | null): this;
    randomSource(source: () => number): this;
    alphaDecay(decay: number): this;
    velocityDecay(decay: number): this;
    stop(): this;
    tick(iterations?: number): this;
    nodes(): N[];
  }

  export interface LinkForce<N extends SimNode, L extends SimLink<N>> extends Force<N> {
    distance(distance: number | ((link: L) => number)): this;
    strength(strength: number | ((link: L) => number)): this;
    iterations(iterations: number): this;
  }

  export interface ManyBodyForce<N extends SimNode> extends Force<N> {
    strength(strength: number | ((node: N) => number)): this;
    theta(theta: number): this;
    distanceMax(distance: number): this;
  }

  export interface CollideForce<N extends SimNode> extends Force<N> {
    radius(radius: number | ((node: N) => number)): this;
    strength(strength: number): this;
    iterations(iterations: number): this;
  }

  export function forceSimulation<N extends SimNode>(nodes: N[], numDimensions?: number): Simulation<N>;
  export function forceLink<N extends SimNode, L extends SimLink<N>>(links: L[]): LinkForce<N, L>;
  export function forceManyBody<N extends SimNode>(): ManyBodyForce<N>;
  export function forceCollide<N extends SimNode>(): CollideForce<N>;
}
