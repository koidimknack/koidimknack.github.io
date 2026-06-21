import { createRouter, createWebHashHistory } from 'vue-router';
import TwoDView from '../views/TwoDView.vue';

const routes = [
  {
    path: '/',
    name: '2d',
    component: TwoDView,
  },
  {
    path: '/3d',
    name: '3d',
    // Lazy-loaded so the Three.js bundle stays out of the default landing page.
    component: () => import('../views/ThreeDView.vue'),
  },
];

const router = createRouter({
  // Hash history keeps deep links working on GitHub Pages without server config.
  history: createWebHashHistory(),
  routes,
});

export default router;
