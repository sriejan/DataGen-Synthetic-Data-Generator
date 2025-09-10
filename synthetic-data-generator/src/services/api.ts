import axios from 'axios';
import { Dataset, ModelConfig, ValidationResults, PromptEngineeringResponse, TransformationCode } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateDataFromPrompt = async (
  prompt: string,
  rowCount: number,
  usePromptEngineering: boolean
): Promise<Dataset> => {
  const response = await api.post('/generate-data', { 
    prompt, 
    rowCount, 
    usePromptEngineering 
  });
  return response.data;
};

export const engineerPrompt = async (prompt: string): Promise<PromptEngineeringResponse> => {
  const response = await api.post('/engineer-prompt', { prompt });
  return response.data;
};

export const generateTransformationCode = async (
  datasetSample: any[],
  transformationInstructions: string
): Promise<TransformationCode> => {
  const response = await api.post('/generate-transformation', {
    datasetSample,
    transformationInstructions
  });
  return response.data;
};

export const applyTransformation = async (
  dataset: Dataset,
  transformationCode: string
): Promise<Dataset> => {
  const response = await api.post('/apply-transformation', {
    dataset,
    transformationCode
  });
  return response.data;
};

export const generateConstraints = async (
  prompt: string
): Promise<Record<string, any>> => {
  const response = await api.post('/generate-constraints', { prompt });
  return response.data;
};

export const trainModel = async (
  dataset: Dataset,
  modelConfig: ModelConfig
): Promise<{ syntheticData: Dataset, validationResults: ValidationResults }> => {
  const response = await api.post('/train-model', {
    dataset,
    modelConfig
  });
  return response.data;
};

export const uploadDataset = async (file: File): Promise<Dataset> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload-dataset', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadSyntheticData = async (format: 'csv' | 'json' = 'csv') => {
  const response = await api.get(`/download-data?format=${format}`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `synthetic_data.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default api; 