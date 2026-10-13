import Phaser from 'phaser';
import { createGameConfig } from './config';
import { installDebugHandle } from './debug/diagnostics';
import { installResizeGuard } from './render/resizeGuard';

const parent = document.getElementById('app');
if (!parent) throw new Error('Missing #app container');

const game = new Phaser.Game(createGameConfig(parent));
installResizeGuard(game);
installDebugHandle(game);

// Dev hot reload must not stack a second canvas on top of the first.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
    delete window.__SMR__;
  });
}
