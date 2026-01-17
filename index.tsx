import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

// Handle module namespace object if default export is wrapped
const Component = (App as any).default ? (App as any).default : App;

root.render(
  <ErrorBoundary>
    <Component />
  </ErrorBoundary>
);