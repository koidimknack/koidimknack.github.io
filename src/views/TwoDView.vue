<template>
  <section class="scene-view">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="Bouncing 2D faces scene"></canvas>
    <div class="scene-controls">
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
        <span class="speed-value">{{ speedFactor.toFixed(1) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createBouncingSpritesScene } from '../scene/createBouncingSpritesScene.js';

const canvasRef = ref(null);
const speedFactor = ref(1);
let sceneController;

onMounted(() => {
  sceneController = createBouncingSpritesScene(canvasRef.value, {
    getSpeedFactor: () => speedFactor.value,
  });
});

onBeforeUnmount(() => {
  sceneController?.destroy();
});
</script>
