import React, { useState, useEffect } from 'react';
import {  Box,  Typography,  TextField,  Button,  Card,  CardContent,  FormControl,  InputLabel,  Select,  MenuItem,  Slider,  CircularProgress,  Alert,  Divider,  Chip,  SelectChangeEvent,} from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import { ModelType, ModelConfig as ModelConfigType } from '../../types';
import { generateConstraints, trainModel } from '../../services/api';
import MainLayout from '../layout/MainLayout';

const ModelConfig: React.FC = () => {
  const {
    originalDataset,
    datasetPrompt,
    setModelConfig,
    setSyntheticDataset,
    setValidationResults,
    setError,
    setIsLoading,
  } = useAppContext();

  const [modelType, setModelType] = useState<ModelType>('CTGAN');
  const [epochs, setEpochs] = useState(500);
  const [batchSize, setBatchSize] = useState(250);
  const [learningRate, setLearningRate] = useState(0.0005);
  const [generatorDim, setGeneratorDim] = useState<string>('[250, 250, 250]');
  const [discriminatorDim, setDiscriminatorDim] = useState<string>('[250, 250, 250]');
  const [pac, setPac] = useState(5);
  const [constraints, setConstraints] = useState<string>('{}');
  const [syntheticRowCount, setSyntheticRowCount] = useState<number>(500);
  const [generating, setGenerating] = useState(false);
  const [generatingConstraints, setGeneratingConstraints] = useState(false);
  
  useEffect(() => {
    // Set default synthetic row count if original dataset is available
    if (originalDataset) {
      setSyntheticRowCount(originalDataset.data.length);
    }
  }, [originalDataset]);

  const handleModelTypeChange = (event: SelectChangeEvent) => {
    setModelType(event.target.value as ModelType);
  };

  const handleGenerateConstraints = async () => {
    if (!datasetPrompt) {
      setError('No dataset prompt available for generating constraints');
      return;
    }

    try {
      setGeneratingConstraints(true);
      setIsLoading(true);

      const result = await generateConstraints(datasetPrompt);
      
      // Format the JSON nicely
      const prettyJson = JSON.stringify(result, null, 2);
      setConstraints(prettyJson);

      setIsLoading(false);
      setGeneratingConstraints(false);
    } catch (error) {
      console.error(error);
      setError(`Failed to generate constraints: ${(error as Error).message}`);
      setIsLoading(false);
      setGeneratingConstraints(false);
    }
  };

  const validateJsonFormat = (jsonText: string): boolean => {
    try {
      JSON.parse(jsonText);
      return true;
    } catch (error) {
      setError(`Invalid JSON format: ${(error as Error).message}`);
      return false;
    }
  };

  const handleTrainModel = async () => {
    if (!originalDataset) {
      setError('No dataset available for training');
      return;
    }

    // Validate JSON format
    if (!validateJsonFormat(constraints)) {
      return;
    }

    try {
      setGenerating(true);
      setIsLoading(true);

      // Parse dimensions
      let generatorDimArray: number[];
      let discriminatorDimArray: number[];

      try {
        generatorDimArray = JSON.parse(generatorDim);
        discriminatorDimArray = JSON.parse(discriminatorDim);
      } catch (error) {
        setError(`Invalid array format: ${(error as Error).message}`);
        setIsLoading(false);
        setGenerating(false);
        return;
      }

      // Create model configuration
      const modelConfig: ModelConfigType = {
        modelType,
        params: {
          epochs,
          batchSize,
          learningRate,
          generatorDim: generatorDimArray,
          discriminatorDim: discriminatorDimArray,
          pac,
        },
        constraints: JSON.parse(constraints),
      };

      // Set model config in context
      setModelConfig(modelConfig);

      // Train model
      const { syntheticData, validationResults } = await trainModel(
        originalDataset,
        modelConfig
      );

      // Update state with results
      setSyntheticDataset(syntheticData);
      setValidationResults(validationResults);

      setIsLoading(false);
      setGenerating(false);
    } catch (error) {
      console.error(error);
      setError(`Model training failed: ${(error as Error).message}`);
      setIsLoading(false);
      setGenerating(false);
    }
  };

  if (!originalDataset) {
    return (
      <MainLayout title="Model Configuration">
        <Alert severity="info">
          Please generate or upload a dataset first and configure data types.
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Model Configuration"
      description="Configure and train a synthetic data generation model."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Card variant="outlined" sx={{ flexGrow: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Model Selection
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="model-type-label">Synthetic Data Generation Model</InputLabel>
                <Select
                  labelId="model-type-label"
                  value={modelType}
                  onChange={handleModelTypeChange}
                  label="Synthetic Data Generation Model"
                >
                  <MenuItem value="CTGAN">CTGAN</MenuItem>
                  <MenuItem value="TVAE">TVAE</MenuItem>
                  <MenuItem value="CopulaGAN">CopulaGAN</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="subtitle2" gutterBottom>
                Model Description
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {modelType === 'CTGAN' && 'CTGAN uses a conditional GAN-based approach for generating synthetic tabular data with mixed discrete and continuous columns.'}
                {modelType === 'TVAE' && 'TVAE uses a variational autoencoder approach for generating synthetic data, which is particularly good for continuous variables.'}
                {modelType === 'CopulaGAN' && 'CopulaGAN combines copula functions with GAN to model complex relationships between variables and generate high-quality synthetic data.'}
              </Typography>
            </CardContent>
          </Card>
          
          <Card variant="outlined" sx={{ flexGrow: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Constraints
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Define value constraints for your synthetic data (e.g., min/max values for numerical fields).
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleGenerateConstraints}
                  disabled={generatingConstraints || !datasetPrompt}
                >
                  {generatingConstraints ? <CircularProgress size={24} /> : 'Generate Constraints'}
                </Button>
                <Button
                  variant="text"
                  onClick={() => validateJsonFormat(constraints)}
                >
                  Validate JSON
                </Button>
              </Box>
              
              <TextField
                label="Value Constraints (JSON)"
                multiline
                rows={8}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                fullWidth
                sx={{ fontFamily: 'monospace', '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
              />
            </CardContent>
          </Card>
        </Box>
        
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Training Parameters
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <Typography id="epochs-slider" gutterBottom>
                  Training Epochs: {epochs}
                </Typography>
                <Slider
                  aria-labelledby="epochs-slider"
                  value={epochs}
                  onChange={(_, value) => setEpochs(value as number)}
                  min={100}
                  max={2000}
                  step={100}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
              
              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <Typography id="batch-size-slider" gutterBottom>
                  Batch Size: {batchSize}
                </Typography>
                <Slider
                  aria-labelledby="batch-size-slider"
                  value={batchSize}
                  onChange={(_, value) => setBatchSize(value as number)}
                  min={64}
                  max={512}
                  step={64}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <Typography id="learning-rate-slider" gutterBottom>
                  Learning Rate
                </Typography>
                <Select
                  value={learningRate.toString()}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                  fullWidth
                >
                  <MenuItem value="0.0001">0.0001</MenuItem>
                  <MenuItem value="0.0005">0.0005</MenuItem>
                  <MenuItem value="0.001">0.001</MenuItem>
                  <MenuItem value="0.005">0.005</MenuItem>
                </Select>
              </Box>
              
              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <Typography id="pac-slider" gutterBottom>
                  PAC: {pac}
                </Typography>
                <Slider
                  aria-labelledby="pac-slider"
                  value={pac}
                  onChange={(_, value) => setPac(value as number)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <TextField
                  label="Generator Architecture"
                  value={generatorDim}
                  onChange={(e) => setGeneratorDim(e.target.value)}
                  fullWidth
                  helperText="Array of dimensions for the generator network"
                />
              </Box>
              
              <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
                <TextField
                  label="Discriminator Architecture"
                  value={discriminatorDim}
                  onChange={(e) => setDiscriminatorDim(e.target.value)}
                  fullWidth
                  helperText="Array of dimensions for the discriminator network"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Generate Synthetic Data</Typography>
              <Box>
                <TextField
                  label="Row Count"
                  type="number"
                  value={syntheticRowCount}
                  onChange={(e) => setSyntheticRowCount(parseInt(e.target.value, 10))}
                  sx={{ width: 150, mr: 2 }}
                  InputProps={{
                    inputProps: { min: 1, max: 10000 }
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleTrainModel}
                  disabled={generating}
                  startIcon={generating ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {generating ? 'Training...' : 'Train Model & Generate Data'}
                </Button>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Training a GAN model can take several minutes depending on the dataset size and training parameters.
              The process involves:
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="1. Preprocessing data" color="default" />
              <Chip label="2. Training generator" color="default" />
              <Chip label="3. Training discriminator" color="default" />
              <Chip label="4. Generating synthetic data" color="default" />
              <Chip label="5. Validating results" color="default" />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </MainLayout>
  );
};

export default ModelConfig; 