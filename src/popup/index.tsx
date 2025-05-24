// src/popup/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
} else {
  console.error("Popup root element not found.");
}
