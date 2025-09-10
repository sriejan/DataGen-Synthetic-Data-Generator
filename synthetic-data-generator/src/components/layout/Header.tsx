import React from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme } from '@mui/material';
import BrainIcon from '@mui/icons-material/Psychology';

const Header: React.FC = () => {
  const theme = useTheme();

  return (
    <AppBar 
      position="fixed" 
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        background: 'linear-gradient(90deg, #3a1c71, #d76d77, #ffaf7b)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}
    >
      <Toolbar>
        <BrainIcon sx={{ fontSize: 32, mr: 2 }} />
                <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>          Business DataGen        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Powered by AI & Deep Learning
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 