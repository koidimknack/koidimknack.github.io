<template>
  <section class="scene-view">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="Bouncing 3D ball scene"></canvas>
    <div class="scene-settings" :class="{ 'is-open': settingsOpen }">
      <aside
        id="settings-3d"
        class="scene-settings-panel"
        :aria-hidden="!settingsOpen"
        aria-label="3D scene settings"
      >
        <div class="scene-settings-title">3D controls</div>

        <div class="scene-settings-grid">
          <div class="scene-control-row">
            <label for="speed-3d">Speed</label>
            <input
              id="speed-3d"
              v-model.number="speedFactor"
              type="range"
              min="0.2"
              max="3"
              step="0.1"
            >
            <span class="control-value">{{ speedFactor.toFixed(1) }}</span>
          </div>

          <div class="scene-control-row">
            <label for="ball-size-3d">Ball size</label>
            <input
              id="ball-size-3d"
              v-model.number="ballRadius"
              type="range"
              min="0.25"
              max="1.35"
              step="0.05"
            >
            <span class="control-value">{{ ballRadius.toFixed(2) }}</span>
          </div>

          <div class="scene-control-row scene-control-row--checkbox">
            <label for="follow-cursor-3d">Follow cursor</label>
            <input
              id="follow-cursor-3d"
              v-model="followCursor"
              type="checkbox"
            >
            <span class="control-value">{{ followCursor ? 'On' : 'Off' }}</span>
          </div>

          <div class="scene-control-row">
            <label for="follow-radius-3d">Follow radius</label>
            <input
              id="follow-radius-3d"
              v-model.number="followRadius"
              type="range"
              :min="ballRadius"
              max="20"
              step="0.1"
            >
            <span class="control-value">{{ followRadius.toFixed(1) }}</span>
          </div>

          <div class="scene-control-row">
            <label for="max-tilt-3d">Max tilt</label>
            <input
              id="max-tilt-3d"
              v-model.number="maxTiltDegrees"
              type="range"
              min="10"
              max="60"
              step="1"
            >
            <span class="control-value">{{ maxTiltDegrees }} deg</span>
          </div>

          <div class="scene-control-row">
            <label for="response-3d">Response</label>
            <input
              id="response-3d"
              v-model.number="tiltSmoothing"
              type="range"
              min="0.02"
              max="1"
              step="0.01"
            >
            <span class="control-value">{{ tiltSmoothing.toFixed(2) }}</span>
          </div>
        </div>

        <button class="scene-settings-reset" type="button" @click="resetSettings">
          Back to defaults
        </button>
      </aside>

      <button
        class="scene-settings-toggle"
        type="button"
        aria-controls="settings-3d"
        :aria-expanded="settingsOpen"
        :aria-label="settingsOpen ? 'Close 3D scene settings' : 'Open 3D scene settings'"
        @click="settingsOpen = !settingsOpen"
      >
        <span class="scene-settings-triangle" aria-hidden="true"></span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createBouncingBallScene } from '../scene/createBouncingBallScene.js';

const DEFAULT_SPEED_FACTOR = 1;
const DEFAULT_FOLLOW_CURSOR = true;
const DEFAULT_FOLLOW_RADIUS = 10;
const DEFAULT_BALL_RADIUS = 0.5;
const DEFAULT_MAX_TILT_DEGREES = 55;
const DEFAULT_TILT_SMOOTHING = 0.18;

const canvasRef = ref(null);
const settingsOpen = ref(false);
const speedFactor = ref(DEFAULT_SPEED_FACTOR);
const followCursor = ref(DEFAULT_FOLLOW_CURSOR);
const followRadius = ref(DEFAULT_FOLLOW_RADIUS);
const ballRadius = ref(DEFAULT_BALL_RADIUS);
const maxTiltDegrees = ref(DEFAULT_MAX_TILT_DEGREES);
const tiltSmoothing = ref(DEFAULT_TILT_SMOOTHING);
let sceneController;

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

watch(ballRadius, (radius) => {
  if (followRadius.value < radius) {
    followRadius.value = radius;
  }
});

async function resetSettings() {
  speedFactor.value = DEFAULT_SPEED_FACTOR;
  followCursor.value = DEFAULT_FOLLOW_CURSOR;
  ballRadius.value = DEFAULT_BALL_RADIUS;
  await nextTick();
  followRadius.value = DEFAULT_FOLLOW_RADIUS;
  maxTiltDegrees.value = DEFAULT_MAX_TILT_DEGREES;
  tiltSmoothing.value = DEFAULT_TILT_SMOOTHING;
}

onMounted(() => {
  sceneController = createBouncingBallScene(canvasRef.value, {
    getSpeedFactor: () => speedFactor.value,
    getLookRange: () => followRadius.value,
    getBallRadius: () => ballRadius.value,
    getMaxLean: () => degreesToRadians(maxTiltDegrees.value),
    getTiltSmoothing: () => tiltSmoothing.value,
    getFacesFollowPointer: () => followCursor.value,
  });
});

onBeforeUnmount(() => {
  sceneController?.destroy();
});
</script>
