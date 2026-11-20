import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';
import App from './App';

setWorkerUrl(maplibreWorkerUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
