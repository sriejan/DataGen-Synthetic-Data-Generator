import React from 'react';
import { Box, Toolbar, Container, Paper, Typography, Alert } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppContext } from '../../context/AppContext';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title,
  description 
}) => {
  const { error, setError } = useAppContext();
  
  const handleErrorClose = () => {
    setError(null);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#f5f7fa',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              mb: 3
            }}
          >
            <Typography variant="h5" component="h1" gutterBottom fontWeight="500">
              {title}
            </Typography>
            {description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {description}
              </Typography>
            )}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={handleErrorClose}
              >
                {error}
              </Alert>
            )}
            {children}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout; 