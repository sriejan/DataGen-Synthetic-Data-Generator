import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import DownloadIcon from '@mui/icons-material/Download';
import { useAppContext } from '../../context/AppContext';
import { downloadSyntheticData } from '../../services/api';
import MainLayout from '../layout/MainLayout';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const ResultsAnalysis: React.FC = () => {
  const { originalDataset, syntheticDataset, validationResults } = useAppContext();
  const [tabValue, setTabValue] = useState(0);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'json'>('csv');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleColumnChange = (event: SelectChangeEvent) => {
    setSelectedColumn(event.target.value);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadSyntheticData(downloadFormat);
      setDownloading(false);
    } catch (error) {
      console.error(error);
      setDownloading(false);
    }
  };

  if (!syntheticDataset) {
    return (
      <MainLayout title="Results Analysis">
        <Alert severity="info">
          Please train a model first to generate synthetic data.
        </Alert>
      </MainLayout>
    );
  }

  // Initialize selectedColumn if not already set
  if (!selectedColumn && syntheticDataset.columns.length > 0) {
    setSelectedColumn(syntheticDataset.columns[0]);
  }

  // Prepare data for distribution chart
  const prepareDistributionData = () => {
    if (!selectedColumn || !originalDataset || !syntheticDataset) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // For categorical columns
    if (
      originalDataset.columnTypes[selectedColumn] === 'categorical' ||
      originalDataset.columnTypes[selectedColumn] === 'boolean'
    ) {
      // Get unique values
      const allValues = [
        ...originalDataset.data.map((row) => String(row[selectedColumn])),
        ...syntheticDataset.data.map((row) => String(row[selectedColumn])),
      ];
      const uniqueValuesSet = new Set(allValues);
      const uniqueValues = Array.from(uniqueValuesSet).sort();

      // Count frequencies
      const originalCounts = uniqueValues.map(
        (value) =>
          originalDataset.data.filter(
            (row) => String(row[selectedColumn]) === value
          ).length / originalDataset.data.length
      );

      const syntheticCounts = uniqueValues.map(
        (value) =>
          syntheticDataset.data.filter(
            (row) => String(row[selectedColumn]) === value
          ).length / syntheticDataset.data.length
      );

      return {
        labels: uniqueValues,
        datasets: [
          {
            label: 'Original Data',
            data: originalCounts,
            backgroundColor: 'rgba(25, 118, 210, 0.7)',
            borderWidth: 1,
          },
          {
            label: 'Synthetic Data',
            data: syntheticCounts,
            backgroundColor: 'rgba(229, 57, 53, 0.7)',
            borderWidth: 1,
          },
        ],
      };
    } else {
      // For numerical columns, create bins
      const allValues = [
        ...originalDataset.data.map((row) => Number(row[selectedColumn])),
        ...syntheticDataset.data.map((row) => Number(row[selectedColumn])),
      ];
      const validValues = allValues.filter((val) => !isNaN(val));
      
      if (validValues.length === 0) {
        return {
          labels: [],
          datasets: [],
        };
      }
      
      const min = Math.min(...validValues);
      const max = Math.max(...validValues);
      const binCount = 10;
      const binWidth = (max - min) / binCount;
      
      const bins = Array.from({ length: binCount }, (_, i) => ({
        start: min + i * binWidth,
        end: min + (i + 1) * binWidth,
        label: `${(min + i * binWidth).toFixed(1)} - ${(min + (i + 1) * binWidth).toFixed(1)}`,
      }));
      
      // Count frequencies
      const originalCounts = bins.map(
        (bin) =>
          originalDataset.data.filter(
            (row) => {
              const value = Number(row[selectedColumn]);
              return value >= bin.start && value < bin.end;
            }
          ).length / originalDataset.data.length
      );

      const syntheticCounts = bins.map(
        (bin) =>
          syntheticDataset.data.filter(
            (row) => {
              const value = Number(row[selectedColumn]);
              return value >= bin.start && value < bin.end;
            }
          ).length / syntheticDataset.data.length
      );

      return {
        labels: bins.map((bin) => bin.label),
        datasets: [
          {
            label: 'Original Data',
            data: originalCounts,
            backgroundColor: 'rgba(25, 118, 210, 0.7)',
            borderWidth: 1,
          },
          {
            label: 'Synthetic Data',
            data: syntheticCounts,
            backgroundColor: 'rgba(229, 57, 53, 0.7)',
            borderWidth: 1,
          },
        ],
      };
    }
  };

  const chartData = prepareDistributionData();

  // Prepare data for statistics table
  const statisticsColumns = [
    {
      field: 'metric',
      headerName: 'Metric',
      width: 150,
    },
    {
      field: 'original',
      headerName: 'Original Data',
      width: 150,
    },
    {
      field: 'synthetic',
      headerName: 'Synthetic Data',
      width: 150,
    },
    {
      field: 'difference',
      headerName: 'Difference',
      width: 150,
      valueGetter: (params: any) => {
        // Check if params and params.row exist
        if (!params || !params.row) return '';
        
        // Get the values directly from the row fields
        const originalValue = params.row.original;
        const syntheticValue = params.row.synthetic;
        
        // Check if both values are valid numbers
        if ((typeof originalValue === 'number' || typeof originalValue === 'string') &&
            (typeof syntheticValue === 'number' || typeof syntheticValue === 'string')) {
          
          // Convert to numbers in case they're strings
          const original = Number(originalValue);
          const synthetic = Number(syntheticValue);
          
          // Make sure conversion worked and values are valid numbers
          if (!isNaN(original) && !isNaN(synthetic)) {
            return Math.abs(original - synthetic).toFixed(2);
          }
        }
        return '';
      },
    },
  ];

  const statisticsRows = [];
  
  if (selectedColumn && validationResults) {
    // Debug output to console
    console.log("Selected column:", selectedColumn);
    console.log("Validation results:", validationResults);
    console.log("Column types in synthetic dataset:", syntheticDataset.columnTypes);
    
    // Try to find the validation result, accommodating for column name differences
    // E.g., "annual_income" might be "income" in validation results
    let resultKey = selectedColumn;
    if (!validationResults[selectedColumn]) {
      // If not found directly, try to find a matching key
      // For example, if "annual_income" is not found, look for "income"
      if (selectedColumn === "annual_income" && validationResults["income"]) {
        resultKey = "income";
      } else if (selectedColumn === "income" && validationResults["annual_income"]) {
        resultKey = "annual_income";
      }
      // Add other potential mappings here as needed
    }
    
    const result = validationResults[resultKey];
    
    if (result && result.originalMean !== undefined) {
      statisticsRows.push(
        {
          id: 1,
          metric: 'Mean',
          original: result.originalMean?.toFixed(2),
          synthetic: result.syntheticMean?.toFixed(2),
        },
        {
          id: 2,
          metric: 'Std. Deviation',
          original: result.originalStd?.toFixed(2),
          synthetic: result.syntheticStd?.toFixed(2),
        },
        {
          id: 3,
          metric: 'Constraint Violations',
          original: 0,
          synthetic: result.constraintViolations,
        }
      );
    }
    // If the result key wasn't found or we have numerical data from the dataset itself,
    // we can calculate basic statistics directly from the data
    else if (syntheticDataset.columnTypes[selectedColumn] === 'numerical') {
      try {
        // Calculate statistics directly from the data
        const originalValues = originalDataset?.data.map(row => Number(row[selectedColumn])) || [];
        const syntheticValues = syntheticDataset.data.map(row => Number(row[selectedColumn]));
        
        // Filter out NaN values
        const validOriginalValues = originalValues.filter(v => !isNaN(v));
        const validSyntheticValues = syntheticValues.filter(v => !isNaN(v));
        
        if (validOriginalValues.length > 0 && validSyntheticValues.length > 0) {
          // Calculate mean
          const originalMean = validOriginalValues.reduce((sum, val) => sum + val, 0) / validOriginalValues.length;
          const syntheticMean = validSyntheticValues.reduce((sum, val) => sum + val, 0) / validSyntheticValues.length;
          
          // Calculate standard deviation
          const originalStd = Math.sqrt(
            validOriginalValues.reduce((sum, val) => sum + Math.pow(val - originalMean, 2), 0) / validOriginalValues.length
          );
          const syntheticStd = Math.sqrt(
            validSyntheticValues.reduce((sum, val) => sum + Math.pow(val - syntheticMean, 2), 0) / validSyntheticValues.length
          );
          
          statisticsRows.push(
            {
              id: 1,
              metric: 'Mean',
              original: originalMean.toFixed(2),
              synthetic: syntheticMean.toFixed(2),
            },
            {
              id: 2,
              metric: 'Std. Deviation',
              original: originalStd.toFixed(2),
              synthetic: syntheticStd.toFixed(2),
            },
            {
              id: 3,
              metric: 'Min',
              original: Math.min(...validOriginalValues).toFixed(2),
              synthetic: Math.min(...validSyntheticValues).toFixed(2),
            },
            {
              id: 4,
              metric: 'Max',
              original: Math.max(...validOriginalValues).toFixed(2),
              synthetic: Math.max(...validSyntheticValues).toFixed(2),
            }
          );
        }
      } catch (error) {
        console.error("Error calculating statistics:", error);
      }
    }
  }

  return (
    <MainLayout
      title="Results Analysis"
      description="Analyze and download your generated synthetic data."
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Synthetic Data Generated: {syntheticDataset.data.length} rows
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="download-format-label">Format</InputLabel>
            <Select
              labelId="download-format-label"
              value={downloadFormat}
              label="Format"
              onChange={(e) => setDownloadFormat(e.target.value as 'csv' | 'json')}
              size="small"
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <CircularProgress size={24} /> : 'Download Data'}
          </Button>
        </Box>
      </Box>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="results analysis tabs"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Data Preview" id="results-tab-0" />
        <Tab label="Distribution Analysis" id="results-tab-1" />
        <Tab label="Statistics" id="results-tab-2" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Synthetic Data Preview
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {syntheticDataset.columns.map((column) => (
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
                {syntheticDataset.data.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {syntheticDataset.columns.map((column) => (
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
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Showing first 10 rows of {syntheticDataset.data.length} total rows.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Distribution Comparison
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="column-select-label">Select Column</InputLabel>
                <Select
                  labelId="column-select-label"
                  value={selectedColumn}
                  label="Select Column"
                  onChange={handleColumnChange}
                >
                  {syntheticDataset.columns.map((column) => (
                    <MenuItem key={column} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ height: 400 }}>
              {chartData.labels.length > 0 ? (
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: `Distribution for ${selectedColumn}`,
                      },
                    },
                    scales: {
                      y: {
                        title: {
                          display: true,
                          text: 'Frequency (%)',
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Value',
                        },
                      },
                    },
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    No valid data for distribution chart
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Statistical Analysis
              </Typography>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="column-select-stats-label">Select Column</InputLabel>
                <Select
                  labelId="column-select-stats-label"
                  value={selectedColumn}
                  label="Select Column"
                  onChange={handleColumnChange}
                >
                  {syntheticDataset.columns.map((column) => (
                    <MenuItem key={column} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {statisticsRows.length > 0 ? (
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={statisticsRows}
                  columns={statisticsColumns}
                  disableRowSelectionOnClick
                  hideFooter
                  disableColumnMenu
                />
              </Box>
            ) : (
              <Alert severity="info">
                Statistical measures not available for {selectedColumn}. This may be because the column is categorical or contains non-numerical data.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </MainLayout>
  );
};

export default ResultsAnalysis; 