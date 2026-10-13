import Phaser from 'phaser';
import { createGameConfig } from './config';
import { installDebugHandle } from './debug/diagnostics';

const parent = document.getElementById('app');
if (!parent) throw new Error('Missing #app container');

const game = new Phaser.Game(createGameConfig(parent));
installDebugHandle(game);

// Dev hot reload must not stack a second canvas on top of the first.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
    delete window.__SMR__;
  });
}
