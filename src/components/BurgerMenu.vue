<template>
  <nav class="burger" aria-label="Site navigation">
    <button
      class="burger-toggle"
      :class="{ 'is-open': isOpen }"
      type="button"
      :aria-expanded="isOpen"
      aria-label="Toggle navigation menu"
      @click="toggle"
    >
      <span class="burger-bar"></span>
      <span class="burger-bar"></span>
      <span class="burger-bar"></span>
    </button>

    <template v-if="isOpen">
      <div class="burger-backdrop" @click="close"></div>
      <ul class="burger-panel">
        <li v-for="item in items" :key="item.to">
          <RouterLink :to="item.to" class="burger-link" @click="close">
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </template>
  </nav>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

// Add future subpages (e.g. { to: '/calendar', label: 'Calendar' }) here.
const items = [
  { to: '/', label: '2D View' },
  { to: '/3d', label: '3D View' },
];

const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    close();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
.burger {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
}

.burger-toggle {
  position: relative;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.burger-bar {
  display: block;
  width: 22px;
  height: 2px;
  margin: 0 auto;
  background: #fff;
  border-radius: 2px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

/* Morph the three bars into an X while the menu is open. */
.burger-toggle.is-open .burger-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.burger-toggle.is-open .burger-bar:nth-child(2) {
  opacity: 0;
}

.burger-toggle.is-open .burger-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.burger-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.burger-panel {
  position: absolute;
  top: 52px;
  right: 0;
  z-index: 1001;
  min-width: 160px;
  margin: 0;
  padding: 8px;
  list-style: none;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}

.burger-panel li + li {
  margin-top: 4px;
}

.burger-link {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  text-decoration: none;
}

.burger-link:hover {
  background: rgba(255, 255, 255, 0.12);
}

.burger-link.router-link-exact-active {
  background: rgba(255, 223, 46, 0.18);
  color: #ffdf2e;
}
</style>
