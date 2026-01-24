import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </AuthProvider>
);
