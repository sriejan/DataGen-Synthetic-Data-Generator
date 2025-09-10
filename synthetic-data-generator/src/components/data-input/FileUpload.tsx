import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAppContext } from '../../context/AppContext';
import { uploadDataset } from '../../services/api';

const FileUpload: React.FC = () => {
  const { setOriginalDataset, setError, setIsLoading } = useAppContext();
  const [uploading, setUploading] = useState<boolean>(false);
  const [filename, setFilename] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      
      // Check file type
      if (
        !file.name.endsWith('.xlsx') &&
        !file.name.endsWith('.xls') &&
        !file.name.endsWith('.csv')
      ) {
        setError('Please upload an Excel (.xlsx, .xls) or CSV file.');
        return;
      }

      try {
        setUploading(true);
        setIsLoading(true);
        setFilename(file.name);
        
        // Upload the file to the server
        const dataset = await uploadDataset(file);
        
        setOriginalDataset(dataset);
        setIsLoading(false);
        setUploading(false);
      } catch (error) {
        console.error(error);
        setError(`Failed to upload file: ${(error as Error).message}`);
        setIsLoading(false);
        setUploading(false);
      }
    },
    [setOriginalDataset, setError, setIsLoading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Dataset
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Upload an Excel (.xlsx, .xls) or CSV file containing your dataset.
        </Typography>
        
        <Paper
          {...getRootProps()}
          sx={{
            p: 5,
            textAlign: 'center',
            backgroundColor: isDragActive ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.05)',
              borderColor: 'primary.main',
            },
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.8 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive
              ? 'Drop the file here'
              : 'Drag and drop your file here, or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: Excel (.xlsx, .xls) and CSV
          </Typography>
          
          {uploading && (
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Uploading {filename}...
              </Typography>
            </Box>
          )}
        </Paper>

        {filename && !uploading && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Successfully uploaded {filename}
          </Alert>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={uploading}
            {...getRootProps()}
            sx={{ minWidth: 200 }}
          >
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Choose File'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FileUpload; 