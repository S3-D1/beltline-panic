import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  backgroundColor: '#1a1a2e',
  scene: [PreloadScene, StartScene, GameScene, GameOverScene],
};

// [YOUTUBE PLAYABLES] SDK load point — uncomment and implement when targeting Playables
// await loadPlayablesSDK();

try {
  const game = new Phaser.Game(config);

  // [YOUTUBE PLAYABLES] Ready signal — uncomment and implement when targeting Playables
  // playablesSDK.ready();

  void game;
} catch (e) {
  console.error('[Beltline Panic] Failed to initialize Phaser game instance:', e);
}
