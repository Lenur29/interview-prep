import globals from 'globals';
import deepEslint, { defineConfig } from '@deepvision/eslint-plugin';

export default defineConfig([
  deepEslint.configs.vue,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]);
