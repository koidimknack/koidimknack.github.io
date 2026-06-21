<template>
  <div class="app">
    <BurgerMenu />
    <RouterView />
  </div>
</template>

<script setup>
import BurgerMenu from './components/BurgerMenu.vue';
</script>

<style>
body,
html {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #000;
  color: #fff;
  font-family: Arial, sans-serif;
}

button,
input {
  font: inherit;
}
</style>

<style scoped>
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}
</style>
