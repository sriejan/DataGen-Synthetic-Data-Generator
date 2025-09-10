import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import PromptInput from './PromptInput';
import FileUpload from './FileUpload';
import { useAppContext } from '../../context/AppContext';
import MainLayout from '../layout/MainLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`data-input-tabpanel-${index}`}
      aria-labelledby={`data-input-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `data-input-tab-${index}`,
    'aria-controls': `data-input-tabpanel-${index}`,
  };
};

const DataInputSection: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { originalDataset } = useAppContext();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <MainLayout
      title="Dataset Specification"
      description="Generate a new dataset from a description or upload an existing file."
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="data input methods"
          sx={{ mb: 2 }}
        >
          <Tab label="Generate from Prompt" {...a11yProps(0)} />
          <Tab label="Upload Excel/CSV" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <PromptInput />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <FileUpload />
      </TabPanel>

      {originalDataset && originalDataset.columns && originalDataset.data && (
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Dataset Preview
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {originalDataset.columns.map((column) => (
                    <th
                      key={column}
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '2px solid #e0e0e0',
                        backgroundColor: '#f5f5f5',
                      }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {originalDataset.data.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {originalDataset.columns.map((column) => (
                      <td
                        key={`${rowIndex}-${column}`}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #e0e0e0',
                        }}
                      >
                        {String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing first 5 rows of {originalDataset.data.length} total rows.
          </Typography>
        </Box>
      )}
    </MainLayout>
  );
};

export default DataInputSection; 