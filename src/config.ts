import { CareerScene } from './scenes/CareerScene';
import Phaser from 'phaser';
import { FormationScene } from './scenes/FormationScene';
import { LabScene } from './scenes/LabScene';
import { StoryScene } from './scenes/StoryScene';
import { ArtGalleryScene } from './scenes/ArtGalleryScene';
import { MatchScene } from './scenes/MatchScene';
import { JungleScene } from './scenes/JungleScene';
import { TacticalTrainingScene } from './scenes/TacticalTrainingScene';
import { WeeklyTrainingScene } from './scenes/WeeklyTrainingScene';
import { CloudyScene } from './scenes/CloudyScene';
import { MatchReportScene } from './scenes/MatchReportScene';
import { MyPlayerScene } from './scenes/MyPlayerScene';
import { RankingsScene } from './scenes/RankingsScene';
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
    scene: [StartScene, FormationScene, MatchScene, CareerScene, LabScene, StoryScene, ArtGalleryScene, JungleScene, TacticalTrainingScene, CloudyScene, MatchReportScene, MyPlayerScene, RankingsScene, WeeklyTrainingScene],
  };
}
