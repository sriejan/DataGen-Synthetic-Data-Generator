import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import {
  DataObject as DataIcon,
  Settings as SettingsIcon,
  BarChart as ChartIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';

const DRAWER_WIDTH = 260;

const steps = [
  { id: 0, name: 'Dataset Specification', icon: <DataIcon /> },
  { id: 1, name: 'Data Configuration', icon: <SettingsIcon /> },
  { id: 2, name: 'Model Configuration', icon: <SettingsIcon /> },
  { id: 3, name: 'Results Analysis', icon: <ChartIcon /> },
];

const Sidebar: React.FC = () => {
  const { currentStep, setCurrentStep, originalDataset, syntheticDataset } = useAppContext();

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to steps that can be accessed
    if (stepIndex === 0 || 
        (stepIndex === 1 && originalDataset) ||
        (stepIndex === 2 && originalDataset) ||
        (stepIndex === 3 && syntheticDataset)) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#f7f9fc',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', p: 2 }}>
        <Typography variant="overline" sx={{ pl: 2, color: '#666' }}>
          WORKFLOW STEPS
        </Typography>
        <List>
          {steps.map((step) => {
            // Determine if step is disabled
            const isDisabled = 
              (step.id === 1 && !originalDataset) ||
              (step.id === 2 && !originalDataset) ||
              (step.id === 3 && !syntheticDataset);

            return (
              <ListItem key={step.id} disablePadding>
                <ListItemButton
                  selected={currentStep === step.id}
                  onClick={() => handleStepClick(step.id)}
                  disabled={isDisabled}
                  sx={{
                    borderRadius: '8px',
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{step.icon}</ListItemIcon>
                  <ListItemText primary={step.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ my: 2 }} />
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            borderRadius: 2,
            mt: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <InfoIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="subtitle2" color="primary.main">
              Information
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
            Generate high-quality synthetic data using AI and Deep Learning models. Follow the steps to configure and train your custom model.
          </Typography>
        </Paper>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 