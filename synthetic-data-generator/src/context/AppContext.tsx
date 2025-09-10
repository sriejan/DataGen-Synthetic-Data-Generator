import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dataset, ModelConfig, ValidationResults } from '../types';

interface AppContextProps {
  originalDataset: Dataset | null;
  setOriginalDataset: (dataset: Dataset | null) => void;
  syntheticDataset: Dataset | null;
  setSyntheticDataset: (dataset: Dataset | null) => void;
  modelConfig: ModelConfig | null;
  setModelConfig: (config: ModelConfig | null) => void;
  validationResults: ValidationResults | null;
  setValidationResults: (results: ValidationResults | null) => void;
  datasetPrompt: string;
  setDatasetPrompt: (prompt: string) => void;
  engineeredPrompt: string;
  setEngineeredPrompt: (prompt: string) => void;
  transformationCode: string;
  setTransformationCode: (code: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [originalDataset, setOriginalDataset] = useState<Dataset | null>(null);
  const [syntheticDataset, setSyntheticDataset] = useState<Dataset | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [datasetPrompt, setDatasetPrompt] = useState<string>('');
  const [engineeredPrompt, setEngineeredPrompt] = useState<string>('');
  const [transformationCode, setTransformationCode] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const value = {
    originalDataset,
    setOriginalDataset,
    syntheticDataset,
    setSyntheticDataset,
    modelConfig,
    setModelConfig,
    validationResults,
    setValidationResults,
    datasetPrompt,
    setDatasetPrompt,
    engineeredPrompt,
    setEngineeredPrompt,
    transformationCode,
    setTransformationCode,
    currentStep,
    setCurrentStep,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 