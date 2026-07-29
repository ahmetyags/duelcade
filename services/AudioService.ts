/** Minimal UI audio service. Background music and game sound layers are disabled. */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { Platform } from 'react-native';

import { gameAssets } from '@/src/assets/gameAssets';
import { useSettingsStore } from '@/store/settingsStore';

type ButtonSoundKey = 'ui_tap' | 'ui_confirm';

const BUTTON_SOUNDS: Record<ButtonSoundKey, number> = {
  ui_tap: gameAssets.audio.uiTap,
  ui_confirm: gameAssets.audio.uiConfirm,
};

class AudioServiceClass {
  private players = new Map<ButtonSoundKey, AudioPlayer>();
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
      for (const [key, source] of Object.entries(BUTTON_SOUNDS) as [ButtonSoundKey, number][]) {
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

  private async playButtonSound(key: ButtonSoundKey): Promise<void> {
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
    await this.playButtonSound('ui_tap');
  }

  async playUiConfirm(): Promise<void> {
    await this.playButtonSound('ui_confirm');
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
