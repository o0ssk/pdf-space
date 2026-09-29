import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/geist';
import App from './App.tsx';
import './index.css';
import { exposePerformanceDiagnostics } from './lib/performance/performanceDiagnostics';
import { exposePersistenceDiagnostics } from './lib/persistence/persistenceDiagnostics';

exposePerformanceDiagnostics();
exposePersistenceDiagnostics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
