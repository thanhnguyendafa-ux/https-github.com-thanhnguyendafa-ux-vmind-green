import * as React from 'react';
import { AppProvider } from './context/AppContext';
import { AppContent } from './components/AppContent';

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
