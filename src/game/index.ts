// Simulation layer. Must stay framework-free: no Phaser, DOM, or rendering imports.
// Renderers in src/render and src/scenes consume this state; nothing here reads from them.
export * from './vec';
export * from './pitch';
export * as attack from './attack';
export * as match from './match';
export * as coach from './coach';
