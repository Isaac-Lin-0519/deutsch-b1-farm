import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import './lib/pwa';
import { applyTheme, loadFont } from './lib/theme';

async function start() {
  await loadFont();
  applyTheme();
  mount(App, { target: document.getElementById('app')! });
}

void start();
