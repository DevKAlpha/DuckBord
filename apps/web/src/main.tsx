/** App entry point. Global styles (design tokens) are imported once here. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/skins.css';
import './design/pixel.css';
import { initMotion, installSkinSprites } from './design';
import { initLocale } from './i18n';
import { App } from './views/App';

// Decide the animation level before the first render (see design/motion.ts).
initMotion();
// Pixel sprites of the seasonal skins, as CSS variables (see design/skinSprites.ts).
installSkinSprites();

// The language is loaded before the first render: no flash of Spanish text.
void initLocale().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
