const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
const SCRIPT_PATH = path.resolve(__dirname, '..', 'add2.py');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only CSV, XLS, and XLSX files are allowed'));
  },
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to run Python script
const runPythonScript = (args) => {
  return new Promise((resolve, reject) => {
    console.log(`Running Python script: ${PYTHON_BIN} ${SCRIPT_PATH} ${args.join(' ')}`);
    const pythonProcess = spawn(PYTHON_BIN, [SCRIPT_PATH, ...args]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      console.log(`Python stdout: ${chunk}`);
      result += chunk;
    });

    pythonProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.error(`Python stderr: ${chunk}`);
      error += chunk;
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        if (error) {
          console.error(`Error details: ${error}`);
        }
        reject(new Error(`Python process exited with code ${code}: ${error}`));
      } else {
        try {
          // Try to parse the result as JSON first
          const jsonResult = JSON.parse(result);
          resolve(jsonResult);
        } catch (e) {
          // If parsing fails, it might be a string that needs to be processed on the client
          // or it's not valid JSON
          console.log('Could not parse as JSON, returning as string:', result.substring(0, 100) + '...');
          resolve(result.trim());
        }
      }
    });
  });
};

// Routes
app.post('/generate-data', async (req, res) => {
  try {
    const { prompt, rowCount, usePromptEngineering } = req.body;
    
    // Save prompt to a temporary file
    const promptFilePath = path.join(uploadsDir, `prompt_${Date.now()}.txt`);
    fs.writeFileSync(promptFilePath, prompt);
    
    // Call Python script
    const args = [
      'generate',
      '--prompt', promptFilePath,
      '--rows', rowCount.toString(),
      '--use-engineering', usePromptEngineering ? 'true' : 'false'
    ];
    
    const result = await runPythonScript(args);
    
    // Clean up temp file
    fs.unlinkSync(promptFilePath);
    
    // If the result is a string, try to extract the JSON part
    if (typeof result === 'string') {
      try {
        // First, clean any markdown formatting that might still exist
        const cleanResult = result
          .replace(/^```(?:json)?/m, '')   // Remove opening markdown
          .replace(/```$/m, '')             // Remove closing markdown
          .trim();
          
        // Find the last occurrence of a JSON object in the string
        const jsonMatch = cleanResult.match(/(\{.*\})$/s);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const extractedJson = JSON.parse(jsonMatch[1]);
            return res.json(extractedJson);
          } catch (jsonError) {
            console.error('Failed to parse extracted JSON:', jsonError);
            // Continue with the existing fallback processing
          }
        }
        
        // If we can't extract JSON object, try parsing the whole cleaned string
        try {
          const parsedResult = JSON.parse(cleanResult);
          return res.json(parsedResult);
        } catch (cleanParseError) {
          // Try the original string as fallback
          const parsedResult = JSON.parse(result);
          return res.json(parsedResult);
        }
      } catch (parseError) {
        // If it's not JSON, send as is
        console.log('Sending string result to client (could not parse)');
        res.send(result);
      }
    } else {
      // If already parsed as JSON object
      res.json(result);
    }
  } catch (error) {
    console.error('Error generating data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/engineer-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Save prompt to a temporary file
    const promptFilePath = path.join(uploadsDir, `prompt_${Date.now()}.txt`);
    fs.writeFileSync(promptFilePath, prompt);
    
    // Call Python script
    const args = ['engineer-prompt', '--prompt', promptFilePath];
    const result = await runPythonScript(args);
    
    // Clean up temp file
    fs.unlinkSync(promptFilePath);
    
    res.json({ engineeredPrompt: result });
  } catch (error) {
    console.error('Error engineering prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate-constraints', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Save prompt to a temporary file
    const promptFilePath = path.join(uploadsDir, `prompt_${Date.now()}.txt`);
    fs.writeFileSync(promptFilePath, prompt);
    
    // Call Python script
    const args = ['generate-constraints', '--prompt', promptFilePath];
    const result = await runPythonScript(args);
    
    // Clean up temp file
    fs.unlinkSync(promptFilePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating constraints:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/train-model', async (req, res) => {
  try {
    const { dataset, modelConfig } = req.body;
    
    // Log the model configuration for debugging
    console.log('Model Training Request:');
    console.log('Model Type:', modelConfig.modelType);
    console.log('Parameters:', JSON.stringify(modelConfig.params, null, 2));
    
    // Save dataset and config to temporary files
    const datasetFilePath = path.join(uploadsDir, `dataset_${Date.now()}.json`);
    const configFilePath = path.join(uploadsDir, `config_${Date.now()}.json`);
    
    fs.writeFileSync(datasetFilePath, JSON.stringify(dataset));
    fs.writeFileSync(configFilePath, JSON.stringify(modelConfig));
    
    // Call Python script
    const args = [
      'train-model',
      '--dataset', datasetFilePath,
      '--config', configFilePath
    ];
    const result = await runPythonScript(args);
    
    // Clean up temp files
    fs.unlinkSync(datasetFilePath);
    fs.unlinkSync(configFilePath);
    
    // Special processing for train-model response
    // If the result is a string, try to extract the JSON object containing syntheticData
    if (typeof result === 'string') {
      try {
        // Look for the JSON object with synthetic data in the string
        const jsonMatch = result.match(/\{"syntheticData":.+\}/s);
        if (jsonMatch) {
          const jsonObject = JSON.parse(jsonMatch[0]);
          return res.json(jsonObject);
        } else {
          // If no direct match, try a more general approach to find any JSON object
          const anyJsonMatch = result.match(/(\{.+\})\s*$/s);
          if (anyJsonMatch) {
            try {
              const extractedJson = JSON.parse(anyJsonMatch[1]);
              return res.json(extractedJson);
            } catch (e) {
              console.error("Failed to parse extracted JSON:", e);
            }
          }
          
          // If all else fails, send an error
          return res.status(500).json({ 
            error: "Could not extract valid JSON from the response",
            rawResponse: result.substring(0, 500) + "..." // First 500 chars for debugging
          });
        }
      } catch (parseError) {
        console.error("Error parsing train-model response:", parseError);
        return res.status(500).json({ 
          error: parseError.message,
          rawResponse: result.substring(0, 500) + "..." 
        });
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/upload-dataset', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Call Python script
    const args = ['process-file', '--file', req.file.path];
    const result = await runPythonScript(args);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/apply-transformation', async (req, res) => {
  try {
    const { dataset, transformationCode } = req.body;
    
    // Save dataset and transformation code to temporary files
    const datasetFilePath = path.join(uploadsDir, `dataset_${Date.now()}.json`);
    const codeFilePath = path.join(uploadsDir, `code_${Date.now()}.py`);
    
    fs.writeFileSync(datasetFilePath, JSON.stringify(dataset));
    fs.writeFileSync(codeFilePath, transformationCode);
    
    // Call Python script
    const args = [
      'transform',
      '--dataset', datasetFilePath,
      '--code', codeFilePath
    ];
    const result = await runPythonScript(args);
    
    // Clean up temp files
    fs.unlinkSync(datasetFilePath);
    fs.unlinkSync(codeFilePath);
    
    res.json(result);
  } catch (error) {
    console.error('Error applying transformation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate-transformation', async (req, res) => {
  try {
    const { datasetSample, transformationInstructions } = req.body;
    
    // Save sample and instructions to temporary files
    const sampleFilePath = path.join(uploadsDir, `sample_${Date.now()}.json`);
    const instructionsFilePath = path.join(uploadsDir, `instructions_${Date.now()}.txt`);
    
    fs.writeFileSync(sampleFilePath, JSON.stringify(datasetSample));
    fs.writeFileSync(instructionsFilePath, transformationInstructions);
    
    // Call Python script
    const args = [
      'generate-transformation',
      '--sample', sampleFilePath,
      '--instructions', instructionsFilePath
    ];
    const result = await runPythonScript(args);
    
    // Clean up temp files
    fs.unlinkSync(sampleFilePath);
    fs.unlinkSync(instructionsFilePath);
    
    res.json({ code: result });
  } catch (error) {
    console.error('Error generating transformation code:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/download-data', async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    
    // Call Python script
    const args = ['download', '--format', format];
    const result = await runPythonScript(args);
    
    // Return file for download
    const filePath = result.filePath;
    if (!filePath) {
      return res.status(404).json({ error: 'No file available to download. Train a model first.' });
    }
    res.download(filePath, `synthetic_data.${format}`, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Error preparing download:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});