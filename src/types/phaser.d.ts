import { AudioManager } from '../systems/AudioManager';

declare module 'phaser' {
  interface Game {
    audioManager?: AudioManager;
  }
}
