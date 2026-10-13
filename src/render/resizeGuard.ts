import Phaser from 'phaser';

/**
 * Works around a Phaser 3.90 RESIZE-mode race. Its orientation handler calls
 * `scale.refresh()` straight away, which sizes the canvas from the cached (old)
 * `parentSize` and only then re-reads the parent. If no game step ran between
 * the window resize and that handler, `ScaleManager.step` sees no further
 * change and the canvas stays at the previous orientation's size.
 *
 * Each step we compare the cached sizes (no DOM reads) and refresh if the game
 * size no longer matches its parent.
 */
export function installResizeGuard(game: Phaser.Game): void {
  game.events.on(Phaser.Core.Events.PRE_STEP, () => {
    const { parentSize, gameSize } = game.scale;
    if (parentSize.width <= 0 || parentSize.height <= 0) return;
    if (gameSize.width !== parentSize.width || gameSize.height !== parentSize.height) {
      game.scale.refresh();
    }
  });
}
