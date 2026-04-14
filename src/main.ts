import Phaser from 'phaser';
import { InitialScene } from './scenes/InitialScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  scene: [InitialScene],
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
