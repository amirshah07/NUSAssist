const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const tempDir = path.join(__dirname, '../temp');
fs.mkdir(tempDir, { recursive: true }).catch(() => {});

router.post('/optimize-timetable', async (req, res) => {
  console.log('Received optimization request');
  
  try {
    const { modules, constraints } = req.body;

    if (!modules || typeof modules !== 'object' || Object.keys(modules).length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or empty modules data',
        received: typeof modules
      });
    }

    if (!constraints || typeof constraints !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid constraints data',
        received: typeof constraints
      });
    }

    const { preferredTimeSlots } = constraints;
    
    if (!preferredTimeSlots || typeof preferredTimeSlots !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid preferred time slots. Must be an object with day-time mappings.' 
      });
    }

    // Validate that at least some time slots are selected
    const hasSelectedSlots = Object.values(preferredTimeSlots).some(daySlots =>
      Object.values(daySlots).some(isSelected => isSelected === true)
    );

    if (!hasSelectedSlots) {
      return res.status(400).json({ 
        error: 'No time slots selected. Please select at least some preferred times.' 
      });
    }

    console.log(`Processing ${Object.keys(modules).length} modules with constraints`);

    const timestamp = Date.now();
    const tempInputFile = path.join(tempDir, `optimization_input_${timestamp}.json`);
    const inputData = { modules, constraints };
    
    await fs.writeFile(tempInputFile, JSON.stringify(inputData, null, 2));
    console.log(`Created temp file: ${tempInputFile}`);

    const pythonScriptPath = path.join(__dirname, '../scripts/optimize_cli.py');
    const venuesPath = path.join(__dirname, '../scripts/venues.json');
    
    try {
      await fs.access(pythonScriptPath);
      await fs.access(venuesPath);
      console.log('Python script and venues file found');
    } catch (error) {
      console.error(`Required files not found:`);
      console.error(`Python script: ${pythonScriptPath}`);
      console.error(`Venues file: ${venuesPath}`);
      await fs.unlink(tempInputFile).catch(() => {});
      return res.status(500).json({ 
        error: 'Optimization files not found',
        missing: error.path,
        suggestion: 'Make sure optimize_cli.py and venues.json exist in the scripts directory'
      });
    }

    console.log('Starting Python optimization process...');
    const pythonProcess = spawn('python3', [
      pythonScriptPath, 
      tempInputFile, 
      '--locations', venuesPath,
      '-v'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(pythonScriptPath),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputData += output;
      console.log('Python stdout:', output.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      errorData += errorMsg;
      console.log('Python stderr:', errorMsg.trim());
    });

    const timeout = setTimeout(() => {
      console.log('Optimization timeout, killing process');
      pythonProcess.kill('SIGTERM');
    }, 90000); // Increased timeout to 90 seconds

    pythonProcess.on('close', async (code) => {
      clearTimeout(timeout);
      
      try {
        await fs.unlink(tempInputFile).catch(() => {});

        if (code !== 0) {
          console.error(`Python process failed with code: ${code}`);
          console.error('Error details:', errorData);
          
          // Try to extract meaningful error message
          let errorMessage = 'Unknown optimization error';
          if (errorData.includes('location')) {
            errorMessage = 'Venue location data issue. Check venues.json file format.';
          } else if (errorData.includes('ortools')) {
            errorMessage = 'OR-Tools library issue. Make sure ortools is installed: pip install ortools';
          } else if (errorData.includes('ModuleNotFoundError')) {
            errorMessage = 'Missing Python dependencies. Run: pip install ortools';
          } else if (errorData.includes('KeyError')) {
            errorMessage = 'Data format error in input modules or constraints';
          }
          
          return res.status(500).json({ 
            error: 'Optimization process failed',
            code: code,
            details: errorMessage,
            fullError: errorData.split('\n').slice(-10).join('\n')
          });
        }

        if (!outputData.trim()) {
          console.error('No output from Python process');
          return res.status(500).json({ 
            error: 'No optimization result received',
            suggestion: 'Python script may have crashed silently'
          });
        }

        try {
          // Try to find JSON in the output (in case there's other text)
          const lines = outputData.split('\n');
          let jsonLine = '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              jsonLine = trimmed;
              break;
            }
          }
          
          if (!jsonLine) {
            // Fallback: try to parse the entire output
            jsonLine = outputData.trim();
          }
          
          const result = JSON.parse(jsonLine);
          console.log('Optimization completed successfully');
          
          const resultModules = Object.keys(result);
          console.log(`Optimized ${resultModules.length} modules`);
          
          res.json(result);

        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError.message);
          console.error('Raw output (first 1000 chars):', outputData.substring(0, 1000));
          
          res.status(500).json({ 
            error: 'Failed to parse optimization result',
            details: parseError.message,
            suggestion: 'Python script output format may be incorrect'
          });
        }

      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        res.status(500).json({ 
          error: 'Internal server error during cleanup'
        });
      }
    });

    pythonProcess.on('error', async (error) => {
      clearTimeout(timeout);
      console.error('Failed to start Python process:', error);
      
      await fs.unlink(tempInputFile).catch(() => {});
      
      let errorMessage = 'Failed to start optimization process';
      if (error.code === 'ENOENT') {
        errorMessage = 'Python3 not found. Make sure Python 3 is installed and accessible.';
      }
      
      res.status(500).json({ 
        error: errorMessage,
        details: error.message,
        suggestion: 'Make sure Python 3 and ortools are installed'
      });
    });

  } catch (error) {
    console.error('Optimization endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;