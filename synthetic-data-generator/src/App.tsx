import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppProvider, useAppContext } from './context/AppContext';
import DataInputSection from './components/data-input/DataInputSection';
import DataConfiguration from './components/data-input/DataConfiguration';
import ModelConfig from './components/model-config/ModelConfig';
import ResultsAnalysis from './components/results/ResultsAnalysis';
import './App.css';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#e57373',
      light: '#ef9a9a',
      dark: '#c62828',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Main content component that uses the AppContext
const MainContent: React.FC = () => {
  const { currentStep } = useAppContext();
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <DataInputSection />;
      case 1:
        return <DataConfiguration />;
      case 2:
        return <ModelConfig />;
      case 3:
        return <ResultsAnalysis />;
      default:
        return <DataInputSection />;
    }
  };
  
  return renderCurrentStep();
};

function App() {
  // Import and use a Google font
  React.useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
