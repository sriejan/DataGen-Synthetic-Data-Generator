export interface DatasetRow {
  [key: string]: string | number | boolean | Date;
}

export interface Dataset {
  data: DatasetRow[];
  columns: string[];
  columnTypes: Record<string, ColumnType>;
  idColumn?: string | null;
}

export type ColumnType = 'categorical' | 'numerical' | 'datetime' | 'boolean';

export interface ModelParams {
  epochs: number;
  batchSize: number;
  learningRate: number;
  generatorDim: number[];
  discriminatorDim: number[];
  pac: number;
}

export type ModelType = 'CTGAN' | 'TVAE' | 'CopulaGAN';

export interface ValueConstraint {
  min?: number;
  max?: number;
  allowedValues?: string[];
}

export interface ModelConfig {
  modelType: ModelType;
  params: ModelParams;
  constraints: Record<string, ValueConstraint>;
}

export interface ValidationResult {
  originalMean?: number;
  syntheticMean?: number;
  originalStd?: number;
  syntheticStd?: number;
  constraintViolations: number;
}

export interface ValidationResults {
  [column: string]: ValidationResult;
}

export interface PromptEngineeringResponse {
  engineeredPrompt: string;
}

export interface TransformationCode {
  code: string;
}

export interface ApiError {
  message: string;
  details?: string;
} 