/** Minimal UI audio service. Background music and game sound layers are disabled. */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { Platform } from 'react-native';

import { gameAssets } from '@/src/assets/gameAssets';
import { useSettingsStore } from '@/store/settingsStore';

type SoundKey = 'ui_tap' | 'ui_confirm' | 'puzzle_rotate' | 'puzzle_error' | 'puzzle_success';

const SOUND_ASSETS: Record<SoundKey, number> = {
  ui_tap: gameAssets.audio.uiTap,
  ui_confirm: gameAssets.audio.uiConfirm,
  puzzle_rotate: gameAssets.audio.puzzleRotate,
  puzzle_error: gameAssets.audio.puzzleError,
  puzzle_success: gameAssets.audio.puzzleSuccess,
};

class AudioServiceClass {
  private players = new Map<SoundKey, AudioPlayer>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      for (const [key, source] of Object.entries(SOUND_ASSETS) as [SoundKey, number][]) {
        this.players.set(key, createAudioPlayer(source, {
          keepAudioSessionActive: false,
          updateInterval: 500,
        }));
      }
      this.initialized = true;
    } catch {
      // Audio is optional and must never block the game.
    }
  }

  private async playSound(key: SoundKey): Promise<void> {
    const volume = useSettingsStore.getState().buttonVolume;
    if (volume <= 0) return;
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      !navigator.userActivation?.hasBeenActive
    ) return;

    try {
      const player = this.players.get(key);
      if (!player) return;
      player.volume = Math.max(0, Math.min(1, volume));
      await player.seekTo(0);
      await player.play();
    } catch {
      // A failed click sound is non-critical.
    }
  }

  async playUiTap(): Promise<void> {
    await this.playSound('ui_tap');
  }

  async playUiConfirm(): Promise<void> {
    await this.playSound('ui_confirm');
  }

  async playGameMove(mode?: string): Promise<void> {
    await this.playSound(mode === 'pipe_circuit' ? 'puzzle_rotate' : 'ui_tap');
  }

  async playGameRoundResult(won: boolean | null): Promise<void> {
    await this.playSound(won === null ? 'ui_confirm' : won ? 'puzzle_success' : 'puzzle_error');
  }

  async previewButtonSound(): Promise<void> {
    await this.playUiConfirm();
  }

  async unloadAll(): Promise<void> {
    for (const player of this.players.values()) {
      try {
        player.release();
      } catch {
        // Ignore release failures.
      }
    }
    this.players.clear();
    this.initialized = false;
  }
}

export const audioService = new AudioServiceClass();
