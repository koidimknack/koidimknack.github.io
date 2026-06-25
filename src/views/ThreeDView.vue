<template>
  <section class="scene-view">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="Bouncing 3D ball scene"></canvas>
    <div
      v-if="catSpeechBubble.visible"
      class="scene-cat-speech-bubble"
      :style="{
        left: `${catSpeechBubble.x}px`,
        top: `${catSpeechBubble.y}px`,
      }"
      aria-live="polite"
    >
      I'm outta hear!
    </div>
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

          <div class="scene-control-row scene-control-row--mode">
            <label id="look-mode-3d">Look target</label>
            <div class="scene-segmented" role="radiogroup" aria-labelledby="look-mode-3d">
              <button
                type="button"
                role="radio"
                :aria-checked="lookMode === LOOK_MODE_CURSOR"
                :class="{ 'is-active': lookMode === LOOK_MODE_CURSOR }"
                @click="lookMode = LOOK_MODE_CURSOR"
              >
                Cursor
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="lookMode === LOOK_MODE_FOCUS"
                :class="{ 'is-active': lookMode === LOOK_MODE_FOCUS }"
                @click="lookMode = LOOK_MODE_FOCUS"
              >
                Focus
              </button>
            </div>
            <span class="control-value">{{ lookModeLabel }}</span>
          </div>

          <div class="scene-control-row" :class="{ 'is-muted': lookMode !== LOOK_MODE_FOCUS }">
            <label id="focus-color-3d">Focus color</label>
            <div class="scene-color-options" role="radiogroup" aria-labelledby="focus-color-3d">
              <button
                v-for="color in BALL_COLOR_OPTIONS"
                :key="color.id"
                type="button"
                class="scene-color-option"
                :class="{ 'is-active': focusColorId === color.id }"
                :style="{ '--swatch-color': color.css }"
                role="radio"
                :aria-checked="focusColorId === color.id"
                :aria-label="`Use ${color.label} ball as center of attention`"
                @click="focusColorId = color.id"
              >
                <span aria-hidden="true"></span>
              </button>
            </div>
            <span class="control-value">{{ selectedFocusColorLabel }}</span>
          </div>

          <div class="scene-control-row" :class="{ 'is-muted': lookMode !== LOOK_MODE_FOCUS }">
            <label for="focus-effects-3d">Focus light</label>
            <input
              id="focus-effects-3d"
              v-model="focusEffectsEnabled"
              type="checkbox"
            >
            <span class="control-value">{{ focusEffectsEnabled ? 'On' : 'Off' }}</span>
          </div>

          <div class="scene-control-row">
            <label for="cat-motion-3d">Cat motion</label>
            <input
              id="cat-motion-3d"
              v-model="catMotionEnabled"
              type="checkbox"
            >
            <span class="control-value">{{ catMotionEnabled ? 'On' : 'Off' }}</span>
          </div>

          <div class="scene-control-row">
            <label for="cat-patience-3d">Cat patience</label>
            <input
              id="cat-patience-3d"
              v-model.number="catPatiencePercent"
              type="range"
              min="0"
              max="100"
              step="1"
            >
            <span class="control-value">{{ catPatiencePercent }}%</span>
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
        <svg
          class="scene-drawer-chevron scene-settings-chevron"
          viewBox="0 0 18 30"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6.5 3 L13.5 15 L6.5 27" />
        </svg>
      </button>
    </div>

    <div
      class="scene-roster-drawer"
      :class="{ 'is-open': rosterOpen }"
      @pointerenter="cancelRosterAutoClose"
      @pointerleave="scheduleRosterAutoClose"
    >
      <div class="scene-roster" aria-label="Scene roster">
        <button
          v-for="item in rosterItems"
          :key="item.id"
          type="button"
          class="scene-roster-item"
          :class="{
            'is-active': isRosterItemActive(item.id),
            'is-shaking': shakeRosterItemId === item.id,
          }"
          :aria-pressed="isRosterItemActive(item.id)"
          :aria-label="`${isRosterItemActive(item.id) ? 'Hide' : 'Show'} ${item.name}`"
          @click="toggleRosterItem(item.id)"
        >
          <img
            v-if="item.type === 'cat'"
            class="scene-roster-cat"
            src="/images/british-shorthair-cat.png"
            alt=""
            aria-hidden="true"
            draggable="false"
          >
          <span
            v-else
            class="scene-roster-swatch"
            :style="{ '--swatch-color': item.css }"
          ></span>
        </button>
      </div>

      <button
        class="scene-roster-toggle"
        type="button"
        :aria-expanded="rosterOpen"
        :aria-label="rosterOpen ? 'Hide ball roster' : 'Show ball roster'"
        @click="toggleRosterOpen"
      >
        <svg
          class="scene-drawer-chevron scene-roster-chevron"
          viewBox="0 0 18 30"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6.5 3 L13.5 15 L6.5 27" />
        </svg>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  pickRandomActiveColorIds,
  toggleActiveRosterId,
} from '../scene/ballRoster.js';
import {
  BALL_COLOR_OPTIONS,
  CAT_OBJECT_ID,
  LOOK_MODE_CURSOR,
  LOOK_MODE_FOCUS,
  createBouncingBallScene,
} from '../scene/createBouncingBallScene.js';

const DEFAULT_SPEED_FACTOR = 1;
const DEFAULT_LOOK_MODE = LOOK_MODE_CURSOR;
const DEFAULT_FOCUS_COLOR_ID = CAT_OBJECT_ID;
const DEFAULT_FOLLOW_RADIUS = 13.5;
const DEFAULT_BALL_RADIUS = 0.5;
const DEFAULT_MAX_TILT_DEGREES = 55;
const DEFAULT_TILT_SMOOTHING = 0.18;
const DEFAULT_FOCUS_EFFECTS_ENABLED = true;
const DEFAULT_CAT_MOTION_ENABLED = true;
const DEFAULT_CAT_PATIENCE_PERCENT = 20;
const DEFAULT_ACTIVE_BALL_COUNT = 4;
const ROSTER_AUTO_CLOSE_DELAY_MS = 5000;
const CAT_FOCUS_LABEL = 'Cat';
const BALL_COLOR_IDS = BALL_COLOR_OPTIONS.map((color) => color.id);
const CAT_ROSTER_ITEM = {
  id: CAT_OBJECT_ID,
  label: CAT_FOCUS_LABEL,
  name: 'Cat',
  type: 'cat',
};

const canvasRef = ref(null);
const settingsOpen = ref(false);
const rosterOpen = ref(true);
const speedFactor = ref(DEFAULT_SPEED_FACTOR);
const lookMode = ref(DEFAULT_LOOK_MODE);
const focusColorId = ref(DEFAULT_FOCUS_COLOR_ID);
const followRadius = ref(DEFAULT_FOLLOW_RADIUS);
const ballRadius = ref(DEFAULT_BALL_RADIUS);
const maxTiltDegrees = ref(DEFAULT_MAX_TILT_DEGREES);
const tiltSmoothing = ref(DEFAULT_TILT_SMOOTHING);
const focusEffectsEnabled = ref(DEFAULT_FOCUS_EFFECTS_ENABLED);
const catMotionEnabled = ref(DEFAULT_CAT_MOTION_ENABLED);
const catPatiencePercent = ref(DEFAULT_CAT_PATIENCE_PERCENT);
const catSpeechBubble = ref({ visible: false, x: 0, y: 0 });
const activeRosterIds = ref([
  CAT_OBJECT_ID,
  ...pickRandomActiveColorIds(BALL_COLOR_OPTIONS, DEFAULT_ACTIVE_BALL_COUNT),
]);
const shakeRosterItemId = ref(null);
let sceneController;
let shakeTimeout;
let rosterAutoCloseTimeout;
let rosterPointerInside = false;

const rosterItems = computed(() => [
  CAT_ROSTER_ITEM,
  ...BALL_COLOR_OPTIONS.map((color) => ({
    ...color,
    name: `${color.label} ball`,
    type: 'ball',
  })),
]);

const activeColorIds = computed(() => (
  activeRosterIds.value.filter((rosterId) => BALL_COLOR_IDS.includes(rosterId))
));

const selectedFocusColorLabel = computed(() => {
  if (focusColorId.value === CAT_OBJECT_ID) {
    return CAT_FOCUS_LABEL;
  }

  return BALL_COLOR_OPTIONS.find((color) => color.id === focusColorId.value)?.label
    ?? BALL_COLOR_OPTIONS[0].label;
});

const lookModeLabel = computed(() => (
  lookMode.value === LOOK_MODE_CURSOR ? 'Cursor' : selectedFocusColorLabel.value
));

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function setLookTarget({ lookMode: nextLookMode, focusColorId: nextFocusColorId }) {
  if (nextLookMode === LOOK_MODE_CURSOR || nextLookMode === LOOK_MODE_FOCUS) {
    lookMode.value = nextLookMode;
  }

  if (isValidFocusTargetId(nextFocusColorId)) {
    focusColorId.value = nextFocusColorId;
  }
}

function isValidFocusTargetId(targetId) {
  return targetId === CAT_OBJECT_ID
    || BALL_COLOR_OPTIONS.some((color) => color.id === targetId);
}

function isFocusTargetActive(targetId) {
  return isRosterItemActive(targetId);
}

function isRosterItemActive(rosterId) {
  return activeRosterIds.value.includes(rosterId);
}

function triggerRosterShake(rosterId) {
  shakeRosterItemId.value = rosterId;
  window.clearTimeout(shakeTimeout);
  shakeTimeout = window.setTimeout(() => {
    shakeRosterItemId.value = null;
  }, 260);
}

function hideCatSpeechBubble() {
  catSpeechBubble.value = {
    ...catSpeechBubble.value,
    visible: false,
  };
}

function setCatSpeechBubble(nextBubble) {
  catSpeechBubble.value = {
    visible: Boolean(nextBubble?.visible),
    x: Number.isFinite(nextBubble?.x) ? nextBubble.x : catSpeechBubble.value.x,
    y: Number.isFinite(nextBubble?.y) ? nextBubble.y : catSpeechBubble.value.y,
  };
}

function cancelRosterAutoClose() {
  rosterPointerInside = true;
  window.clearTimeout(rosterAutoCloseTimeout);
}

function scheduleRosterAutoClose() {
  rosterPointerInside = false;
  window.clearTimeout(rosterAutoCloseTimeout);
  if (!rosterOpen.value) {
    return;
  }

  rosterAutoCloseTimeout = window.setTimeout(() => {
    if (!rosterPointerInside) {
      rosterOpen.value = false;
    }
  }, ROSTER_AUTO_CLOSE_DELAY_MS);
}

function toggleRosterOpen() {
  rosterOpen.value = !rosterOpen.value;
  if (rosterOpen.value && !rosterPointerInside) {
    scheduleRosterAutoClose();
    return;
  }

  window.clearTimeout(rosterAutoCloseTimeout);
}

function toggleRosterItem(rosterId) {
  const result = toggleActiveRosterId(activeRosterIds.value, rosterId);

  if (result.rejected) {
    triggerRosterShake(rosterId);
    return;
  }

  activeRosterIds.value = result.activeRosterIds;
  if (!isRosterItemActive(CAT_OBJECT_ID)) {
    hideCatSpeechBubble();
  }
  if (lookMode.value === LOOK_MODE_FOCUS && !isFocusTargetActive(focusColorId.value)) {
    lookMode.value = LOOK_MODE_CURSOR;
  }
}

function deactivateRosterItem(rosterId) {
  if (!isRosterItemActive(rosterId)) {
    return;
  }

  activeRosterIds.value = activeRosterIds.value.filter((activeRosterId) => activeRosterId !== rosterId);
  if (rosterId === CAT_OBJECT_ID) {
    hideCatSpeechBubble();
  }
  if (lookMode.value === LOOK_MODE_FOCUS && !isFocusTargetActive(focusColorId.value)) {
    lookMode.value = LOOK_MODE_CURSOR;
  }
}

watch(ballRadius, (radius) => {
  if (followRadius.value < radius) {
    followRadius.value = radius;
  }
});

watch([activeRosterIds, focusColorId], () => {
  if (lookMode.value === LOOK_MODE_FOCUS && !isFocusTargetActive(focusColorId.value)) {
    lookMode.value = LOOK_MODE_CURSOR;
  }
});

async function resetSettings() {
  speedFactor.value = DEFAULT_SPEED_FACTOR;
  lookMode.value = DEFAULT_LOOK_MODE;
  focusColorId.value = DEFAULT_FOCUS_COLOR_ID;
  focusEffectsEnabled.value = DEFAULT_FOCUS_EFFECTS_ENABLED;
  catMotionEnabled.value = DEFAULT_CAT_MOTION_ENABLED;
  catPatiencePercent.value = DEFAULT_CAT_PATIENCE_PERCENT;
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
    getLookMode: () => lookMode.value,
    getFocusColorId: () => focusColorId.value,
    getFocusEffectsEnabled: () => focusEffectsEnabled.value,
    getCatMotionEnabled: () => catMotionEnabled.value,
    getCatPatiencePercent: () => catPatiencePercent.value,
    getCatActive: () => isRosterItemActive(CAT_OBJECT_ID),
    getActiveColorIds: () => activeColorIds.value,
    onLookTargetChange: setLookTarget,
    onCatSpeechBubbleChange: setCatSpeechBubble,
    onCatRunAway: () => deactivateRosterItem(CAT_OBJECT_ID),
  });
  scheduleRosterAutoClose();
});

onBeforeUnmount(() => {
  window.clearTimeout(shakeTimeout);
  window.clearTimeout(rosterAutoCloseTimeout);
  hideCatSpeechBubble();
  sceneController?.destroy();
});
</script>
