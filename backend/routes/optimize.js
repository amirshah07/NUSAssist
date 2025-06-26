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

    console.log(`Processing ${Object.keys(modules).length} modules with constraints:`, constraints);

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
        missing: error.path
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
      cwd: path.dirname(pythonScriptPath)
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      errorData += errorMsg;
      console.log('Python log:', errorMsg.trim());
    });

    const timeout = setTimeout(() => {
      console.log('Optimization timeout, killing process');
      pythonProcess.kill('SIGTERM');
    }, 60000);

    pythonProcess.on('close', async (code) => {
      clearTimeout(timeout);
      
      try {
        await fs.unlink(tempInputFile).catch(() => {});

        if (code !== 0) {
          console.error(`Python process failed with code: ${code}`);
          console.error('Error details:', errorData);
          return res.status(500).json({ 
            error: 'Optimization process failed',
            code: code,
            details: errorData.split('\n').slice(-5).join('\n')
          });
        }

        if (!outputData.trim()) {
          console.error('No output from Python process');
          return res.status(500).json({ 
            error: 'No optimization result received'
          });
        }

        try {
          const result = JSON.parse(outputData);
          console.log('Optimization completed successfully');
          
          const resultModules = Object.keys(result);
          console.log(`Optimized ${resultModules.length} modules`);
          
          res.json(result);

        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError.message);
          console.error('Raw output (first 500 chars):', outputData.substring(0, 500));
          
          res.status(500).json({ 
            error: 'Failed to parse optimization result',
            details: parseError.message
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
      
      res.status(500).json({ 
        error: 'Failed to start optimization process',
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