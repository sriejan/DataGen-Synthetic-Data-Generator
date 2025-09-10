import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import { generateDataFromPrompt, engineerPrompt } from '../../services/api';

const DEFAULT_PROMPT = `Create a customer dataset with:
- customer_id (unique identifier)
- age (18-80)
- income (30000-150000)
- purchase_frequency (1-52)
- customer_segment (Basic, Premium, VIP)
- satisfaction_score (1-100)

Ensure realistic correlations between income, purchase_frequency, and customer_segment.`;

const PromptInput: React.FC = () => {
  const {
    originalDataset,
    setOriginalDataset,
    setDatasetPrompt,
    datasetPrompt,
    setEngineeredPrompt,
    setError,
    setIsLoading,
  } = useAppContext();

  const [localPrompt, setLocalPrompt] = useState<string>(datasetPrompt || DEFAULT_PROMPT);
  const [usePromptEngineering, setUsePromptEngineering] = useState<boolean>(true);
  const [rowCount, setRowCount] = useState<number>(500);
  const [chunkSize, setChunkSize] = useState<number>(100);
  const [engineeringResult, setEngineeringResult] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [engineeringInProgress, setEngineeringInProgress] = useState<boolean>(false);
  const [generationSuccess, setGenerationSuccess] = useState<boolean>(false);

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPrompt(event.target.value);
    setGenerationSuccess(false);
  };

  const handleUsePromptEngineeringChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsePromptEngineering(event.target.checked);
  };

  const handleRowCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      setRowCount(value);
    }
  };

  const handleChunkSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      setChunkSize(value);
    }
  };

  const handleGenerateDataset = async () => {
    try {
      setGenerating(true);
      setIsLoading(true);
      setDatasetPrompt(localPrompt);
      setGenerationSuccess(false);
      
      // Generate the dataset
      const dataset = await generateDataFromPrompt(
        localPrompt, 
        rowCount, 
        usePromptEngineering
      );
      
      // Ensure dataset is properly structured before setting it
      if (typeof dataset === 'string') {
        // If the server returned a JSON string instead of parsed object
        try {
          const parsedDataset = JSON.parse(dataset);
          setOriginalDataset(parsedDataset);
        } catch (parseError) {
          console.error('Failed to parse dataset response:', parseError);
          setError(`Failed to parse dataset response: ${(parseError as Error).message}`);
          setIsLoading(false);
          setGenerating(false);
          return;
        }
      } else {
        // If we already received a parsed object
        setOriginalDataset(dataset);
      }
      
      setIsLoading(false);
      setGenerating(false);
      setGenerationSuccess(true);
    } catch (error) {
      console.error(error);
      setError(`Failed to generate dataset: ${(error as Error).message}`);
      setIsLoading(false);
      setGenerating(false);
      setGenerationSuccess(false);
    }
  };

  const handleRunPromptEngineering = async () => {
    try {
      setEngineeringInProgress(true);
      setIsLoading(true);
      
      // Run prompt engineering
      const result = await engineerPrompt(localPrompt);
      
      setEngineeringResult(result.engineeredPrompt);
      setEngineeredPrompt(result.engineeredPrompt);
      
      setIsLoading(false);
      setEngineeringInProgress(false);
    } catch (error) {
      console.error(error);
      setError(`Failed to engineer prompt: ${(error as Error).message}`);
      setIsLoading(false);
      setEngineeringInProgress(false);
    }
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Dataset Description
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Describe your dataset requirements in detail. Include column names, data types, value ranges, and any correlations.
          </Typography>
          <TextField
            label="Dataset Description"
            multiline
            rows={8}
            value={localPrompt}
            onChange={handlePromptChange}
            fullWidth
            placeholder="Describe your dataset here..."
            variant="outlined"
            sx={{ mb: 3 }}
          />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flexGrow: 1, minWidth: '250px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={usePromptEngineering}
                    onChange={handleUsePromptEngineeringChange}
                    color="primary"
                  />
                }
                label="Automatically determine column names if not provided"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleRunPromptEngineering}
                disabled={engineeringInProgress || !localPrompt}
                sx={{ mr: 1 }}
              >
                {engineeringInProgress ? (
                  <CircularProgress size={24} />
                ) : (
                  'Test Prompt Engineering'
                )}
              </Button>
            </Box>
          </Box>
          
          {engineeringResult && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Engineered Prompt:
              </Typography>
              <TextField
                multiline
                rows={6}
                value={engineeringResult}
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                sx={{ 
                  fontFamily: 'monospace',
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                  },
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                This is how the AI has interpreted your dataset requirements
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Generation Settings
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flexGrow: 1, minWidth: '200px' }}>
              <TextField
                label="Number of rows"
                type="number"
                value={rowCount}
                onChange={handleRowCountChange}
                fullWidth
                InputProps={{ inputProps: { min: 50, max: 10000 } }}
              />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: '200px' }}>
              <TextField
                label="Chunk size"
                type="number"
                value={chunkSize}
                onChange={handleChunkSizeChange}
                fullWidth
                InputProps={{ inputProps: { min: 10, max: 500 } }}
                helperText="Smaller chunks may be more stable but slower"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            {generationSuccess && originalDataset && (
              <Alert severity="success" sx={{ flexGrow: 1, mr: 2 }}>
                Dataset generated successfully! {originalDataset && originalDataset.data && Array.isArray(originalDataset.data) ? originalDataset.data.length : 0} rows created.
              </Alert>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleGenerateDataset}
              disabled={generating || !localPrompt}
              sx={{ minWidth: 200 }}
            >
              {generating ? <CircularProgress size={24} color="inherit" /> : 'Generate Dataset'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {generationSuccess &&
        originalDataset &&
        Array.isArray(originalDataset.data) &&
        Array.isArray(originalDataset.columns) &&
        originalDataset.data.length > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generated Data Preview
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {Array.isArray(originalDataset.columns) && originalDataset.columns.slice(0, 5).map((column) => (
                        <TableCell key={column}>{column}</TableCell>
                      ))}
                      {Array.isArray(originalDataset.columns) && originalDataset.columns.length > 5 && (
                        <TableCell>...</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(originalDataset.data) && originalDataset.data.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {Array.isArray(originalDataset.columns) && originalDataset.columns.slice(0, 5).map((column) => (
                          <TableCell key={`${index}-${column}`}>{row[column] !== undefined ? String(row[column]) : ''}</TableCell>
                        ))}
                        {Array.isArray(originalDataset.columns) && originalDataset.columns.length > 5 && (
                          <TableCell>...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Showing first 5 rows and columns. Click "Data Configuration" in the sidebar to view full dataset.
              </Typography>
            </CardContent>
          </Card>
        )}
    </Box>
  );
};

export default PromptInput; 