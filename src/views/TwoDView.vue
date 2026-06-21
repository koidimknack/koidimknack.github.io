<template>
  <section class="scene-view">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="Bouncing 2D faces scene"></canvas>
    <div class="scene-settings" :class="{ 'is-open': settingsOpen }">
      <aside
        id="settings-2d"
        class="scene-settings-panel"
        :aria-hidden="!settingsOpen"
        aria-label="2D scene settings"
      >
        <div class="scene-settings-title">2D controls</div>

        <div class="scene-settings-grid">
          <div class="scene-control-row">
            <label for="speed-2d">Speed</label>
            <input
              id="speed-2d"
              v-model.number="speedFactor"
              type="range"
              min="0.2"
              max="3"
              step="0.1"
            >
            <span class="control-value">{{ speedFactor.toFixed(1) }}</span>
          </div>

          <div class="scene-control-row">
            <label for="face-size-2d">Face size</label>
            <input
              id="face-size-2d"
              v-model.number="spriteSize"
              type="range"
              min="40"
              max="160"
              step="5"
            >
            <span class="control-value">{{ spriteSize }} px</span>
          </div>
        </div>

        <button class="scene-settings-reset" type="button" @click="resetSettings">
          Back to defaults
        </button>
      </aside>

      <button
        class="scene-settings-toggle"
        type="button"
        aria-controls="settings-2d"
        :aria-expanded="settingsOpen"
        :aria-label="settingsOpen ? 'Close 2D scene settings' : 'Open 2D scene settings'"
        @click="settingsOpen = !settingsOpen"
      >
        <span class="scene-settings-triangle" aria-hidden="true"></span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createBouncingSpritesScene } from '../scene/createBouncingSpritesScene.js';

const DEFAULT_SPEED_FACTOR = 1;
const DEFAULT_SPRITE_SIZE = 80;

const canvasRef = ref(null);
const settingsOpen = ref(false);
const speedFactor = ref(DEFAULT_SPEED_FACTOR);
const spriteSize = ref(DEFAULT_SPRITE_SIZE);
let sceneController;

function resetSettings() {
  speedFactor.value = DEFAULT_SPEED_FACTOR;
  spriteSize.value = DEFAULT_SPRITE_SIZE;
}

onMounted(() => {
  sceneController = createBouncingSpritesScene(canvasRef.value, {
    getSpeedFactor: () => speedFactor.value,
    getSpriteSize: () => spriteSize.value,
  });
});

onBeforeUnmount(() => {
  sceneController?.destroy();
});
</script>
