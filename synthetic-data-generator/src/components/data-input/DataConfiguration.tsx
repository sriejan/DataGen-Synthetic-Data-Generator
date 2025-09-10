import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAppContext } from '../../context/AppContext';
import { ColumnType } from '../../types';
import MainLayout from '../layout/MainLayout';

const DataConfiguration: React.FC = () => {
  const { originalDataset, setOriginalDataset, setError } = useAppContext();
  const [idColumn, setIdColumn] = useState<string | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    // Initialize column types if dataset is available
    if (originalDataset && Object.keys(columnTypes).length === 0) {
      const initialTypes: Record<string, ColumnType> = {};
      originalDataset.columns.forEach((column) => {
        // Try to infer column type from data
        const sampleValue = originalDataset.data[0]?.[column];
        
        if (typeof sampleValue === 'number') {
          initialTypes[column] = 'numerical';
        } else if (
          typeof sampleValue === 'string' && 
          !isNaN(Date.parse(sampleValue))
        ) {
          initialTypes[column] = 'datetime';
        } else if (
          sampleValue === true || 
          sampleValue === false ||
          sampleValue === 'true' ||
          sampleValue === 'false'
        ) {
          initialTypes[column] = 'boolean';
        } else {
          initialTypes[column] = 'categorical';
        }
      });
      setColumnTypes(initialTypes);
    }
  }, [originalDataset, columnTypes]);

  const handleIdColumnChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setIdColumn(value === 'none' ? null : value);
  };

  const handleColumnTypeChange = (column: string, type: ColumnType) => {
    setColumnTypes({
      ...columnTypes,
      [column]: type,
    });

    // Check for high cardinality in categorical columns
    if (
      type === 'categorical' && 
      originalDataset && 
      originalDataset.data.length > 0
    ) {
      const uniqueValues = new Set(
        originalDataset.data.map((row) => row[column])
      ).size;
      
      const cardinalityRatio = uniqueValues / originalDataset.data.length;
      
      if (cardinalityRatio > 0.5) {
        setWarnings((prevWarnings) => [
          ...prevWarnings.filter((w) => !w.includes(column)),
          `Column '${column}' has high cardinality (${uniqueValues} unique values out of ${originalDataset.data.length}). Consider using a different type.`,
        ]);
      } else {
        setWarnings((prevWarnings) => 
          prevWarnings.filter((w) => !w.includes(column))
        );
      }
    }
  };

  const handleSaveConfiguration = () => {
    if (!originalDataset) return;
    
    try {
      setSaving(true);
      
      // Check if id column has unique values
      if (idColumn) {
        const values = originalDataset.data.map((row) => row[idColumn]);
        const uniqueValues = new Set(values);
        
        if (uniqueValues.size !== values.length) {
          setError(`Column '${idColumn}' contains duplicate values and cannot be used as a primary key`);
          setSaving(false);
          return;
        }
      }
      
      // Update dataset with column types and id column
      setOriginalDataset({
        ...originalDataset,
        columnTypes,
        idColumn,
      });
      
      setSaving(false);
    } catch (error) {
      console.error(error);
      setError(`Failed to save configuration: ${(error as Error).message}`);
      setSaving(false);
    }
  };

  if (!originalDataset) {
    return (
      <MainLayout title="Data Configuration">
        <Alert severity="info">
          Please generate or upload a dataset first.
        </Alert>
      </MainLayout>
    );
  }

  // Create columns for the data grid
  const columns: GridColDef[] = [
    {
      field: 'column',
      headerName: 'Column Name',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ fontWeight: params.value === idColumn ? 'bold' : 'normal' }}>
          {params.value}
          {params.value === idColumn && (
            <Chip
              label="ID"
              size="small"
              color="primary"
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Data Type',
      width: 180,
      renderCell: (params) => (
        <FormControl fullWidth size="small">
          <Select
            value={columnTypes[params.row.column] || 'categorical'}
            onChange={(e) =>
              handleColumnTypeChange(
                params.row.column,
                e.target.value as ColumnType
              )
            }
          >
            <MenuItem value="categorical">Categorical</MenuItem>
            <MenuItem value="numerical">Numerical</MenuItem>
            <MenuItem value="datetime">DateTime</MenuItem>
            <MenuItem value="boolean">Boolean</MenuItem>
          </Select>
        </FormControl>
      ),
    },
    {
      field: 'sample',
      headerName: 'Sample Values',
      width: 300,
      renderCell: (params) => {
        const samples = originalDataset.data
          .slice(0, 3)
          .map((row) => String(row[params.row.column]))
          .join(', ');
        return <span>{samples}</span>;
      },
    },
  ];

  // Create rows for the data grid
  const rows = originalDataset.columns.map((column, index) => ({
    id: index,
    column,
    type: columnTypes[column] || 'categorical',
  }));

  return (
    <MainLayout
      title="Data Configuration"
      description="Configure column types and identify the primary key for your dataset."
    >
      {warnings.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {warnings.map((warning, index) => (
            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
              {warning}
            </Alert>
          ))}
        </Box>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Primary Key Selection
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Select a column to serve as the unique identifier (primary key) for each row.
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel id="id-column-label">ID Column (Optional)</InputLabel>
            <Select
              labelId="id-column-label"
              value={idColumn || 'none'}
              onChange={handleIdColumnChange}
              label="ID Column (Optional)"
            >
              <MenuItem value="none">None - No primary key needed</MenuItem>
              {originalDataset.columns.map((column) => (
                <MenuItem key={column} value={column}>
                  {column}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Column Types
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Specify the data type for each column in your dataset.
          </Typography>
          
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[10]}
              disableRowSelectionOnClick
              disableColumnMenu
              density="comfortable"
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSaveConfiguration}
          disabled={saving}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Apply Configuration'}
        </Button>
      </Box>
    </MainLayout>
  );
};

export default DataConfiguration; 