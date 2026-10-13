import Phaser from 'phaser';
import { AttackScene } from './scenes/AttackScene';
import { FormationScene } from './scenes/FormationScene';
import { MatchScene } from './scenes/MatchScene';
import { PitchScene } from './scenes/PitchScene';
import { StartScene } from './scenes/StartScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#f7a072',
    banner: false,
    disableContextMenu: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      expandParent: false,
      autoRound: true,
    },
    render: {
      antialias: true,
    },
    input: {
      activePointers: 2,
    },
    // First scene auto-starts; the rest wait for scene.start().
    scene: [StartScene, PitchScene, AttackScene, FormationScene, MatchScene],
  };
}
