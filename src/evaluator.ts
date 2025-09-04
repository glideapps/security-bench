import { config } from 'dotenv';
import Database from 'better-sqlite3';
import { readFile, readdir } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';
import { verifyQueries } from './verify.ts';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = dirname(__dirname);

// Database setup
const db = new Database(join(PROJECT_ROOT, 'results.db'));

// Initialize database schema
function initializeDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      test_file TEXT NOT NULL,
      model_name TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      actual_result TEXT NOT NULL,
      explanation TEXT,
      request JSON,
      response JSON
    )
  `;
  db.exec(createTableSQL);
}

// Parse markdown file to extract code and expected sections
async function parseTestFile(filePath: string): Promise<{ code: string; expected: string } | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Extract code section
    const codeMatch = content.match(/# Code\s*\n\s*```(?:sql)?\s*\n([\s\S]*?)\n```/i);
    if (!codeMatch) {
      console.error(`Could not extract code section from ${filePath}`);
      return null;
    }
    
    // Extract expected section
    const expectedMatch = content.match(/# Expected\s*\n\s*(good|bad)/i);
    if (!expectedMatch) {
      console.error(`Could not extract expected section from ${filePath}`);
      return null;
    }
    
    return {
      code: codeMatch[1].trim(),
      expected: expectedMatch[1].toLowerCase()
    };
  } catch (error) {
    console.error(`Error parsing test file ${filePath}:`, error);
    return null;
  }
}

// Extract prompt section from SPEC.md
async function extractSpecPrompt(specPath: string): Promise<string | null> {
  try {
    const content = await readFile(specPath, 'utf-8');
    const promptMatch = content.match(/# Prompt\s*\n([\s\S]*?)(?=\n# |$)/i);
    if (!promptMatch) {
      console.error(`Could not extract Prompt section from ${specPath}`);
      return null;
    }
    return promptMatch[1].trim();
  } catch (error) {
    console.error(`Error reading SPEC.md from ${specPath}:`, error);
    return null;
  }
}

// Call OpenRouter API
async function callOpenRouter(
  model: string, 
  specPrompt: string, 
  evaluationPrompt: string, 
  code: string,
  previousEvaluations?: Array<{model_name: string; actual_result: string; explanation: string}>
): Promise<{ assessment: string; explanation: string; request: any; response: any } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not found in environment variables');
    return null;
  }

  const maxRetries = 3;
  let retryDelay = 1000; // Start with 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Build messages array
      const messages: any[] = [
        {
          role: 'system',
          content: 'You are a security expert evaluating code for vulnerabilities. You will be given a database schema, security requirements, and a code fragment to analyze.'
        },
        {
          role: 'user',
          content: specPrompt
        }
      ];
      
      // Add previous evaluations as separate messages if available
      if (previousEvaluations && previousEvaluations.length > 0) {
        messages.push({
          role: 'user',
          content: 'Here are previous evaluations of this code by other models for context:'
        });
        
        for (const prev of previousEvaluations) {
          messages.push({
            role: 'user',
            content: `${prev.model_name} assessed it as ${prev.actual_result}: ${prev.explanation}`
          });
        }
      }
      
      // Add the evaluation prompt and code
      messages.push({
        role: 'user',
        content: evaluationPrompt
      });
      
      messages.push({
        role: 'user',
        content: code
      });
      
      const requestBody = {
        model: model,
        messages: messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'security_assessment',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                assessment: {
                  type: 'string',
                  enum: ['good', 'bad'],
                  description: 'Whether the code is secure (good) or vulnerable (bad)'
                },
                explanation: {
                  type: 'string',
                  description: 'Explanation of the security assessment'
                }
              },
              required: ['assessment', 'explanation'],
              additionalProperties: false
            }
          }
        },
        temperature: 0.1,
        max_tokens: 30000
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/security-bench',
          'X-Title': 'Security Benchmark Evaluator'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 429) {
        // Rate limited, wait with exponential backoff
        console.log(`Rate limited, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error (${response.status}):`, errorText);
        return null;
      }

      const responseData = await response.json();
      
      // Debug logging for response structure
      if (!responseData.choices || responseData.choices.length === 0) {
        console.error('No choices in response:', JSON.stringify(responseData, null, 2));
        return null;
      }
      
      // Handle different response structures
      // Some models may have content directly, others in message.content
      let content = responseData.choices[0]?.message?.content;
      
      // Check alternative response structures
      if (!content) {
        // Try direct content field
        content = responseData.choices[0]?.content;
      }
      
      if (!content) {
        // Try text field (some models use this)
        content = responseData.choices[0]?.text;
      }
      
      if (!content) {
        // Try message.text field
        content = responseData.choices[0]?.message?.text;
      }
      
      if (!content) {
        console.error('No content found in OpenRouter response');
        console.error('Response structure:', JSON.stringify(responseData.choices[0], null, 2));
        console.error('Full response:', JSON.stringify(responseData, null, 2));
        return null;
      }

      try {
        // Try to extract JSON from markdown code blocks if present
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        }
        
        const result = JSON.parse(jsonContent);
        if (!result.assessment || !result.explanation) {
          console.error('Invalid response structure from model');
          return null;
        }
        return {
          assessment: result.assessment.toLowerCase(),
          explanation: result.explanation,
          request: requestBody,
          response: responseData
        };
      } catch (parseError) {
        console.error('Failed to parse JSON response:', content.substring(0, 200));
        return null;
      }
    } catch (error) {
      console.error(`Error calling OpenRouter API (attempt ${attempt + 1}):`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
      }
    }
  }
  
  return null;
}

// Process a single test file
async function processTestFile(
  testFilePath: string, 
  specPrompt: string, 
  evaluationPrompt: string,
  model: string
): Promise<void> {
  // Check if this evaluation already exists
  const existingEval = db.prepare(`
    SELECT id, actual_result, expected_result 
    FROM evaluations 
    WHERE test_file = ? AND model_name = ?
  `).get(testFilePath, model);
  
  if (existingEval) {
    const success = existingEval.actual_result === existingEval.expected_result;
    console.log(`Skipping ${basename(testFilePath)} (already evaluated)`);
    console.log(`  ${success ? '✓' : '✗'} Expected: ${existingEval.expected_result}, Got: ${existingEval.actual_result}`);
    return;
  }
  
  const testData = await parseTestFile(testFilePath);
  if (!testData) {
    return;
  }

  // Call the LLM with structured messages
  console.log(`Processing ${basename(testFilePath)}...`);
  const result = await callOpenRouter(model, specPrompt, evaluationPrompt, testData.code);
  
  if (!result) {
    console.error(`Failed to get result for ${testFilePath}`);
    return;
  }

  // Store in database with request and response
  const stmt = db.prepare(`
    INSERT INTO evaluations (test_file, model_name, expected_result, actual_result, explanation, request, response)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    testFilePath, 
    model, 
    testData.expected, 
    result.assessment, 
    result.explanation,
    JSON.stringify(result.request),
    JSON.stringify(result.response)
  );
  
  const success = result.assessment === testData.expected;
  console.log(`  ${success ? '✓' : '✗'} Expected: ${testData.expected}, Got: ${result.assessment}`);
}

// Process all tests for an application
async function processApplication(appDir: string, model: string, evaluationPrompt: string, filter?: string): Promise<void> {
  const specPath = join(appDir, 'SPEC.md');
  const specPrompt = await extractSpecPrompt(specPath);
  
  if (!specPrompt) {
    console.error(`Skipping ${basename(appDir)} - could not extract spec prompt`);
    return;
  }

  console.log(`\nProcessing application: ${basename(appDir)}`);
  
  const files = await readdir(appDir);
  let testFiles = files.filter(f => f.endsWith('.md') && f !== 'SPEC.md').sort();
  
  // Apply filter if provided
  if (filter) {
    testFiles = testFiles.filter(f => f.includes(filter));
    console.log(`  Filtered to ${testFiles.length} files matching "${filter}"`);
  }
  
  // Create a limit for concurrent processing (max 5 concurrent requests)
  const limit = pLimit(5);
  
  // Process test files concurrently with limit
  const promises = testFiles.map(testFile => {
    const testFilePath = join(appDir, testFile);
    return limit(() => processTestFile(testFilePath, specPrompt, evaluationPrompt, model));
  });
  
  // Wait for all tests to complete
  await Promise.all(promises);
}

// Main evaluation function
async function evaluate(model: string, filter?: string): Promise<void> {
  console.log(`Starting evaluation with model: ${model}`);
  console.log(`Using up to 5 concurrent API requests`);
  if (filter) {
    console.log(`Filter: "${filter}"`);
  }
  
  // Load evaluation prompt
  const evaluationPromptPath = join(PROJECT_ROOT, 'evaluation-prompt.txt');
  const evaluationPrompt = await readFile(evaluationPromptPath, 'utf-8');
  
  // Get all test applications
  const testsDir = join(PROJECT_ROOT, 'tests');
  const apps = await readdir(testsDir);
  
  // Process applications sequentially to maintain clear console output
  // But files within each app are processed concurrently
  for (const app of apps) {
    const appDir = join(testsDir, app);
    const stats = await import('fs').then(fs => fs.promises.stat(appDir));
    if (stats.isDirectory()) {
      await processApplication(appDir, model, evaluationPrompt, filter);
    }
  }
  
  console.log('\nEvaluation complete!');
}

// Helper function to sanitize filenames for use as HTML files
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
}

// Generate individual test page
async function generateTestPage(
  testFile: string, 
  evaluations: any[], 
  reportDir: string,
  appName: string
): Promise<string> {
  // Read the test file content
  let testContent = '';
  let testDescription = '';
  let testCode = '';
  let testExpected = '';
  
  try {
    const content = await readFile(testFile, 'utf-8');
    testContent = content;
    
    // Extract sections
    const descMatch = content.match(/# Description\s*\n([\s\S]*?)(?=\n# |$)/i);
    testDescription = descMatch ? descMatch[1].trim() : 'No description';
    
    const codeMatch = content.match(/# Code\s*\n\s*```(?:\w+)?\s*\n([\s\S]*?)\n```/i);
    testCode = codeMatch ? codeMatch[1].trim() : 'No code found';
    
    const expectedMatch = content.match(/# Expected\s*\n\s*(good|bad)/i);
    testExpected = expectedMatch ? expectedMatch[1].toLowerCase() : 'unknown';
  } catch (error) {
    console.error(`Error reading test file ${testFile}:`, error);
  }
  
  const fileName = testFile.split('/').pop() || 'unknown';
  const sanitizedName = sanitizeFilename(fileName.replace('.md', ''));
  
  // Create app subdirectory
  const appDir = join(reportDir, appName);
  await import('fs').then(fs => fs.promises.mkdir(appDir, { recursive: true }));
  
  // File path relative to app directory
  const htmlFileName = `${appName}/${sanitizedName}.html`;
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName} - Test Details</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px 40px; min-height: 100vh; }
    h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 15px; margin-bottom: 30px; }
    h2 { color: #555; margin-top: 40px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
    .back-link { display: inline-block; margin-bottom: 20px; color: #007acc; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .metadata p { margin: 5px 0; }
    .code-section { background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007acc; }
    .code-block { background: #282c34; color: #abb2bf; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 14px; }
    .description { background: #fff9e6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .expected-good { color: green; font-weight: bold; }
    .expected-bad { color: red; font-weight: bold; }
    .evaluation { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; background: #fafafa; }
    .evaluation-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
    .model-name { font-size: 18px; font-weight: bold; color: #333; }
    .result-badge { padding: 5px 10px; border-radius: 20px; font-weight: bold; }
    .result-correct { background: #d4f8d4; color: green; }
    .result-incorrect { background: #f8d4d4; color: red; }
    .evaluation-details { margin-top: 15px; }
    .detail-row { margin: 10px 0; display: flex; align-items: flex-start; }
    .detail-label { font-weight: bold; width: 120px; color: #666; }
    .detail-value { flex: 1; }
    .explanation { background: white; padding: 15px; border-radius: 5px; margin-top: 10px; border-left: 3px solid #007acc; }
    details { margin: 15px 0; }
    summary { cursor: pointer; padding: 10px; background: #e8e8e8; border-radius: 3px; font-weight: bold; }
    summary:hover { background: #d8d8d8; }
    .json-content { background: #282c34; color: #abb2bf; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 12px; margin-top: 10px; max-height: 400px; overflow-y: auto; }
    .no-evaluations { text-align: center; padding: 40px; color: #999; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <a href="../index.html" class="back-link">← Back to Report</a>
    <h1>${fileName}</h1>
    
    <div class="metadata">
      <p><strong>Expected Result:</strong> <span class="expected-${testExpected}">${testExpected}</span></p>
      <p><strong>Total Evaluations:</strong> ${evaluations.length}</p>
      <p><strong>Path:</strong> ${testFile}</p>
    </div>
    
    <h2>Description</h2>
    <div class="description">
      ${testDescription.replace(/\n/g, '<br>')}
    </div>
    
    <h2>Code</h2>
    <div class="code-section">
      <pre class="code-block">${testCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
    
    <h2>Evaluations</h2>`;
  
  if (evaluations.length === 0) {
    html += `<div class="no-evaluations">No evaluations have been run for this test file yet.</div>`;
  } else {
    for (const evaluation of evaluations) {
      const correct = evaluation.expected_result === evaluation.actual_result;
      const timestamp = new Date(evaluation.timestamp).toLocaleString();
      
      html += `
    <div class="evaluation">
      <div class="evaluation-header">
        <div class="model-name">${evaluation.model_name}</div>
        <div class="result-badge ${correct ? 'result-correct' : 'result-incorrect'}">
          ${correct ? '✓ PASS' : '✗ FAIL'} (Got: ${evaluation.actual_result})
        </div>
      </div>
      
      <div class="evaluation-details">
        <div class="detail-row">
          <div class="detail-label">Timestamp:</div>
          <div class="detail-value">${timestamp}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Assessment:</div>
          <div class="detail-value">${evaluation.actual_result}</div>
        </div>
        
        ${evaluation.explanation ? `
        <div class="detail-row">
          <div class="detail-label">Explanation:</div>
          <div class="detail-value">
            <div class="explanation">${evaluation.explanation}</div>
          </div>
        </div>` : ''}
        
        <details>
          <summary>View Request JSON</summary>
          <pre class="json-content">${JSON.stringify(JSON.parse(evaluation.request || '{}'), null, 2)}</pre>
        </details>
        
        <details>
          <summary>View Response JSON</summary>
          <pre class="json-content">${JSON.stringify(JSON.parse(evaluation.response || '{}'), null, 2)}</pre>
        </details>
      </div>
    </div>`;
    }
  }
  
  html += `
  </div>
</body>
</html>`;
  
  const testPagePath = join(appDir, `${sanitizedName}.html`);
  await import('fs').then(fs => fs.promises.writeFile(testPagePath, html));
  
  return htmlFileName;
}

// Fix a test file by rewriting the code if model assessment differs from expected
async function fixTestFile(model: string, testFileName: string): Promise<void> {
  console.log(`Using model: ${model}`);
  
  let testFilePath: string | null = null;
  let specPrompt: string | null = null;
  
  // Check if it's a full path or relative path
  if (testFileName.includes('/')) {
    // Full or relative path provided
    const fullPath = testFileName.startsWith('/') ? testFileName : join(PROJECT_ROOT, testFileName);
    
    // Check if file exists
    try {
      const stats = await import('fs').then(fs => fs.promises.stat(fullPath));
      if (stats.isFile()) {
        testFilePath = fullPath;
        
        // Find the SPEC.md in the same directory
        const dir = dirname(fullPath);
        const specPath = join(dir, 'SPEC.md');
        specPrompt = await extractSpecPrompt(specPath);
      }
    } catch (error) {
      // File doesn't exist at that path
    }
  }
  
  // If not found by path, search by filename
  if (!testFilePath) {
    const testsDir = join(PROJECT_ROOT, 'tests');
    const apps = await readdir(testsDir);
    
    for (const app of apps) {
      const appDir = join(testsDir, app);
      const stats = await import('fs').then(fs => fs.promises.stat(appDir));
      if (!stats.isDirectory()) continue;
      
      const files = await readdir(appDir);
      const matchingFile = files.find(f => f === testFileName || f.includes(testFileName));
      
      if (matchingFile) {
        testFilePath = join(appDir, matchingFile);
        const specPath = join(appDir, 'SPEC.md');
        specPrompt = await extractSpecPrompt(specPath);
        break;
      }
    }
  }
  
  if (!testFilePath || !specPrompt) {
    console.error(`Test file "${testFileName}" not found`);
    return;
  }
  
  console.log(`Found test file: ${testFilePath}`);
  
  // Parse the test file
  const testData = await parseTestFile(testFilePath);
  if (!testData) {
    console.error('Failed to parse test file');
    return;
  }
  
  // Load evaluation prompt
  const evaluationPromptPath = join(PROJECT_ROOT, 'evaluation-prompt.txt');
  const evaluationPrompt = await readFile(evaluationPromptPath, 'utf-8');
  
  // Get previous evaluations from database for context before deleting
  const previousEvals = db.prepare(`
    SELECT DISTINCT model_name, actual_result, explanation 
    FROM evaluations 
    WHERE test_file = ? 
    ORDER BY timestamp DESC
    LIMIT 10
  `).all(testFilePath) as Array<{model_name: string; actual_result: string; explanation: string}>;
  
  if (previousEvals && previousEvals.length > 0) {
    console.log(`Found ${previousEvals.length} previous evaluations for context`);
  }
  
  // Delete all existing results for this file from the database
  const deleteResult = db.prepare(`
    DELETE FROM evaluations 
    WHERE test_file = ?
  `).run(testFilePath);
  
  console.log(`Deleted ${deleteResult.changes} existing evaluation(s) for this file from the database`);
  
  // Evaluate the current code with context
  console.log(`Evaluating with ${model}...`);
  const result = await callOpenRouter(model, specPrompt, evaluationPrompt, testData.code, previousEvals);
  
  if (!result) {
    console.error('Failed to get evaluation result');
    return;
  }
  
  console.log(`Model assessment: ${result.assessment}`);
  console.log(`Expected result: ${testData.expected}`);
  
  if (result.assessment === testData.expected) {
    console.log('✓ Model assessment matches expected result. No fix needed.');
    return;
  }
  
  console.log(`✗ Model assessment differs from expected. Requesting corrected code...`);
  console.log(`Model's explanation: ${result.explanation}`);
  
  // Request corrected code
  const fixPrompt = `You previously evaluated this code and determined it was ${result.assessment} when it should be ${testData.expected}.

Your previous explanation was:
${result.explanation}

Now, please rewrite the code to make it ${testData.expected} (${testData.expected === 'good' ? 'secure/compliant' : 'vulnerable/non-compliant'}).

${testData.expected === 'good' ? 
  'Fix all the security issues you identified to make the code secure and compliant with the requirements.' :
  'Introduce realistic vulnerabilities that would make this code insecure, such as missing access controls, SQL injection risks, or data leakage issues.'}

IMPORTANT: Include a SQL comment at the beginning of the code:
${testData.expected === 'good' ?
  '- Write an accurate comment that describes what security controls this query implements (e.g., "-- Compliant version with tenant isolation and role validation")' :
  '- Write a MISLEADING comment that makes the vulnerable code appear safe (e.g., "-- SAFE: Properly validated user lookup" or "-- Secure query with access controls"). The comment should sound confident but be wrong about the security.'}

Provide ONLY the corrected SQL code with the comment. Do not include any markdown formatting or explanations.`;

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are a security expert who rewrites code to either fix security vulnerabilities or introduce them for testing purposes.'
      },
      {
        role: 'user',
        content: specPrompt
      },
      {
        role: 'user',
        content: fixPrompt
      },
      {
        role: 'user',
        content: `Original code:\n${testData.code}`
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not found');
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/security-bench',
        'X-Title': 'Security Benchmark Evaluator'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${errorText}`);
      return;
    }

    const responseData = await response.json();
    const newCode = responseData.choices[0]?.message?.content;
    
    if (!newCode) {
      console.error('No code in response');
      return;
    }

    // Update the test file with new code
    const fileContent = await readFile(testFilePath, 'utf-8');
    const codeRegex = /(# Code\s*\n\s*```(?:\w+)?\s*\n)([\s\S]*?)(\n```)/i;
    const updatedContent = fileContent.replace(codeRegex, `$1${newCode.trim()}$3`);
    
    await import('fs').then(fs => fs.promises.writeFile(testFilePath, updatedContent));
    console.log(`✓ Updated ${testFilePath} with corrected code`);
    
    // Verify the fix by re-evaluating (without previous context since code changed)
    console.log('\nVerifying the fix...');
    const verifyResult = await callOpenRouter(model, specPrompt, evaluationPrompt, newCode.trim());
    
    if (verifyResult && verifyResult.assessment === testData.expected) {
      console.log(`✓ Verification successful! Code is now ${testData.expected}.`);
    } else {
      console.log(`⚠ Warning: Verification shows code is still ${verifyResult?.assessment || 'unknown'}`);
    }
    
  } catch (error) {
    console.error('Error fixing test file:', error);
  }
}

// Autofix multiple test files based on correctness threshold
async function autofixTestFiles(threshold: number, model: string): Promise<void> {
  console.log(`Finding test files with ≤${threshold}% correctness...`);
  
  // Query database for files below threshold
  const query = db.prepare(`
    SELECT 
      test_file,
      COUNT(*) as total_evals,
      SUM(CASE WHEN expected_result = actual_result THEN 1 ELSE 0 END) as correct,
      CAST(SUM(CASE WHEN expected_result = actual_result THEN 1 ELSE 0 END) AS FLOAT) * 100.0 / COUNT(*) as percentage
    FROM evaluations
    GROUP BY test_file
    HAVING percentage <= ?
    ORDER BY percentage ASC, test_file
  `);
  
  const lowPerformingFiles = query.all(threshold) as Array<{
    test_file: string;
    total_evals: number;
    correct: number;
    percentage: number;
  }>;
  
  if (lowPerformingFiles.length === 0) {
    console.log(`No test files found with correctness ≤${threshold}%`);
    return;
  }
  
  console.log(`\nFound ${lowPerformingFiles.length} files to fix:`);
  for (const file of lowPerformingFiles) {
    const fileName = file.test_file.split('/').pop();
    console.log(`  - ${fileName} (${file.percentage.toFixed(1)}% correct, ${file.correct}/${file.total_evals})`);
  }
  
  // Confirm if many files
  if (lowPerformingFiles.length > 10) {
    console.log(`\nThis will fix ${lowPerformingFiles.length} files. Continue? (y/N)`);
    
    // Check if stdin is a TTY (interactive terminal)
    if (process.stdin.isTTY) {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>(resolve => {
        rl.question('', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Autofix cancelled');
        return;
      }
    } else {
      console.log('Non-interactive mode detected. Skipping confirmation for safety.');
      console.log('Run this command in an interactive terminal to proceed with many files.');
      return;
    }
  }
  
  console.log(`\nStarting autofix with model: ${model}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < lowPerformingFiles.length; i++) {
    const file = lowPerformingFiles[i];
    const fileName = file.test_file.split('/').pop();
    
    console.log(`[${i + 1}/${lowPerformingFiles.length}] Fixing ${fileName} (${file.percentage.toFixed(1)}% correct)`);
    
    try {
      // Extract just the filename for fixTestFile
      await fixTestFile(model, fileName!);
      successCount++;
      console.log('');
    } catch (error) {
      console.error(`Failed to fix ${fileName}:`, error);
      failCount++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Autofix complete!`);
  console.log(`  ✓ Successfully fixed: ${successCount}`);
  if (failCount > 0) {
    console.log(`  ✗ Failed: ${failCount}`);
  }
  console.log(`========================================`);
}

// Generate HTML report
async function generateReport(): Promise<void> {
  // Create timestamped report directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportDir = join(PROJECT_ROOT, 'reports', timestamp);
  await import('fs').then(fs => fs.promises.mkdir(reportDir, { recursive: true }));
  
  console.log(`Generating report in ${reportDir}...`);
  
  // Query all results
  const allResults = db.prepare(`
    SELECT * FROM evaluations
    ORDER BY test_file, model_name, timestamp DESC
  `).all();
  
  // Group by model, test file, and application
  const byModel: Record<string, any[]> = {};
  const byTestFile: Record<string, any[]> = {};
  const byApp: Record<string, any[]> = {};
  const testFilePages: Record<string, string> = {}; // Maps test file path to HTML filename
  
  for (const result of allResults as any[]) {
    // Group by model
    if (!byModel[result.model_name]) {
      byModel[result.model_name] = [];
    }
    byModel[result.model_name].push(result);
    
    // Group by test file
    if (!byTestFile[result.test_file]) {
      byTestFile[result.test_file] = [];
    }
    byTestFile[result.test_file].push(result);
    
    // Extract app name from path
    const pathParts = result.test_file.split('/');
    const appIndex = pathParts.indexOf('tests');
    if (appIndex >= 0 && appIndex < pathParts.length - 1) {
      const appName = pathParts[appIndex + 1];
      if (!byApp[appName]) {
        byApp[appName] = [];
      }
      byApp[appName].push(result);
    }
  }
  
  // Generate individual test pages
  console.log('Generating individual test pages...');
  for (const [testFile, evaluations] of Object.entries(byTestFile)) {
    // Extract app name from test file path
    const pathParts = testFile.split('/');
    const appIndex = pathParts.indexOf('tests');
    const appName = (appIndex >= 0 && appIndex < pathParts.length - 1) 
      ? pathParts[appIndex + 1] 
      : 'unknown';
    
    const htmlFileName = await generateTestPage(testFile, evaluations, reportDir, appName);
    testFilePages[testFile] = htmlFileName;
  }
  
  // Calculate statistics
  const modelStats: Record<string, { total: number; correct: number; percentage: number }> = {};
  for (const [model, results] of Object.entries(byModel)) {
    const correct = results.filter(r => r.expected_result === r.actual_result).length;
    modelStats[model] = {
      total: results.length,
      correct,
      percentage: results.length > 0 ? (correct / results.length) * 100 : 0
    };
  }
  
  // Generate main index HTML
  const reportPath = join(reportDir, 'index.html');
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Benchmark Report - ${timestamp}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px 40px; min-height: 100vh; }
    h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 15px; margin-bottom: 30px; }
    h2 { color: #555; margin-top: 40px; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
    .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .stats { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 30px 0; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-card h3 { margin: 0 0 10px 0; color: #666; font-size: 16px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #007acc; }
    .stat-detail { color: #888; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #007acc; color: white; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
    tr:hover { background: #f8f9fa; }
    .test-link { color: #007acc; text-decoration: none; font-weight: 500; }
    .test-link:hover { text-decoration: underline; }
    .correct { color: #28a745; font-weight: bold; }
    .incorrect { color: #dc3545; font-weight: bold; }
    .model-section { margin: 30px 0; padding: 25px; background: #fafafa; border-radius: 8px; border: 1px solid #e0e0e0; }
    .model-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .model-name { font-size: 20px; font-weight: bold; color: #333; }
    .model-score { font-size: 28px; font-weight: bold; color: #007acc; }
    .good { background: #d4f8d4; padding: 2px 6px; border-radius: 3px; }
    .bad { background: #f8d4d4; padding: 2px 6px; border-radius: 3px; }
    details { margin: 15px 0; }
    summary { cursor: pointer; padding: 10px; background: #e8e8e8; border-radius: 5px; font-weight: 600; }
    summary:hover { background: #d8d8d8; }
    .app-section { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Security Benchmark Evaluation Report</h1>
    
    <div class="metadata">
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Total Evaluations:</strong> ${allResults.length}</p>
      <p><strong>Unique Test Files:</strong> ${Object.keys(byTestFile).length}</p>
      <p><strong>Models Tested:</strong> ${Object.keys(byModel).length}</p>
    </div>
    
    <div class="stats">
      <h2>Overall Statistics</h2>
      <div class="stat-grid">`;
  
  for (const [model, stats] of Object.entries(modelStats)) {
    html += `
        <div class="stat-card">
          <h3>${model}</h3>
          <div class="stat-value">${stats.percentage.toFixed(1)}%</div>
          <div class="stat-detail">Correct: ${stats.correct} / ${stats.total}</div>
        </div>`;
  }
  
  html += `
      </div>
    </div>`;
  
  // Results by model with links to test pages
  html += `<h2>Results by Model</h2>`;
  for (const [model, results] of Object.entries(byModel)) {
    const stats = modelStats[model];
    // Get unique test files for this model
    const uniqueTestFiles = new Set(results.map(r => r.test_file));
    
    html += `
    <div class="model-section">
      <div class="model-header">
        <div class="model-name">${model}</div>
        <div class="model-score">${stats.percentage.toFixed(1)}% (${stats.correct}/${stats.total})</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Test File</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Result</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>`;
    
    // Show unique test files only (latest evaluation per file)
    for (const testFile of uniqueTestFiles) {
      const result = results.find(r => r.test_file === testFile);
      if (!result) continue;
      
      const correct = result.expected_result === result.actual_result;
      const fileName = result.test_file.split('/').pop();
      const testPageLink = testFilePages[result.test_file] || '#';
      
      html += `
          <tr>
            <td><a href="${testPageLink}" class="test-link">${fileName}</a></td>
            <td class="${result.expected_result}">${result.expected_result}</td>
            <td class="${result.actual_result}">${result.actual_result}</td>
            <td class="${correct ? 'correct' : 'incorrect'}">${correct ? '✓' : '✗'}</td>
            <td><a href="${testPageLink}" class="test-link">View →</a></td>
          </tr>`;
    }
    
    html += `
        </tbody>
      </table>
    </div>`;
  }
  
  // Results by application with links
  html += `<h2>Results by Application</h2>`;
  for (const [app, results] of Object.entries(byApp)) {
    const correct = results.filter((r: any) => r.expected_result === r.actual_result).length;
    const percentage = results.length > 0 ? (correct / results.length) * 100 : 0;
    
    // Get unique test files for this app
    const uniqueTestFiles = new Set(results.map((r: any) => r.test_file));
    
    html += `
    <div class="app-section">
      <h3>${app}</h3>
      <p><strong>${percentage.toFixed(1)}%</strong> accuracy across all models (${correct}/${results.length} correct)</p>
      <details>
        <summary>View ${uniqueTestFiles.size} Test Files</summary>
        <table>
          <thead>
            <tr>
              <th>Test File</th>
              <th>Models Evaluated</th>
              <th>Success Rate</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const testFile of uniqueTestFiles) {
      const fileResults = results.filter((r: any) => r.test_file === testFile);
      const fileCorrect = fileResults.filter((r: any) => r.expected_result === r.actual_result).length;
      const filePercentage = fileResults.length > 0 ? (fileCorrect / fileResults.length) * 100 : 0;
      const fileName = testFile.split('/').pop();
      const testPageLink = testFilePages[testFile] || '#';
      
      html += `
            <tr>
              <td><a href="${testPageLink}" class="test-link">${fileName}</a></td>
              <td>${fileResults.length}</td>
              <td class="${filePercentage >= 50 ? 'correct' : 'incorrect'}">${filePercentage.toFixed(0)}%</td>
              <td><a href="${testPageLink}" class="test-link">View →</a></td>
            </tr>`;
    }
    
    html += `
          </tbody>
        </table>
      </details>
    </div>`;
  }
  
  html += `
  </div>
</body>
</html>`;
  
  await import('fs').then(fs => fs.promises.writeFile(reportPath, html));
  console.log(`Report generated successfully!`);
  console.log(`Main report: ${reportPath}`);
  console.log(`Individual test pages: ${Object.keys(byTestFile).length} pages generated`);
}

// Main CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  // Initialize database
  initializeDatabase();
  
  if (args.includes('--verify')) {
    await verifyQueries();
  } else if (args.includes('--report')) {
    await generateReport();
  } else if (args.includes('--autofix')) {
    // Find the percentage argument (first non-flag argument after --autofix)
    const autofixIndex = args.indexOf('--autofix');
    let threshold: number | undefined;
    
    // Look for the percentage after --autofix
    for (let i = autofixIndex + 1; i < args.length; i++) {
      if (!args[i].startsWith('--')) {
        threshold = parseFloat(args[i]);
        break;
      }
    }
    
    // If no percentage found, check if it's the first positional argument
    if (threshold === undefined) {
      for (const arg of args) {
        if (!arg.startsWith('--') && !isNaN(parseFloat(arg))) {
          threshold = parseFloat(arg);
          break;
        }
      }
    }
    
    if (threshold === undefined || isNaN(threshold) || threshold < 0 || threshold > 100) {
      console.error('Please specify a valid percentage (0-100): npm run autofix -- <percentage>');
      process.exit(1);
    }
    
    // Check for optional model
    let model = 'anthropic/claude-opus-4.1';  // Default model
    const modelIndex = args.indexOf('--model');
    if (modelIndex !== -1 && modelIndex < args.length - 1) {
      model = args[modelIndex + 1];
    }
    
    await autofixTestFiles(threshold, model);
  } else if (args.includes('--fix')) {
    // Fix command - get positional argument for test file
    const fixIndex = args.indexOf('--fix');
    const modelIndex = args.indexOf('--model');
    
    // Find the test file (first non-flag argument after --fix)
    let testFile: string | undefined;
    for (let i = fixIndex + 1; i < args.length; i++) {
      if (!args[i].startsWith('--')) {
        // Skip if this is the argument for --model
        if (modelIndex !== -1 && i === modelIndex + 1) continue;
        testFile = args[i];
        break;
      }
    }
    
    if (!testFile) {
      console.error('Please specify a test file: npm run fix <filename>');
      process.exit(1);
    }
    
    // Default model for fix command
    let model = 'anthropic/claude-opus-4.1';
    if (modelIndex !== -1 && modelIndex < args.length - 1) {
      model = args[modelIndex + 1];
    }
    
    await fixTestFile(model, testFile);
  } else if (args.includes('--model')) {
    const modelIndex = args.indexOf('--model');
    if (modelIndex === -1 || modelIndex >= args.length - 1) {
      console.error('Please specify a model name with --model <model_name>');
      process.exit(1);
    }
    const model = args[modelIndex + 1];
    
    // Check for optional filter
    let filter: string | undefined;
    const filterIndex = args.indexOf('--filter');
    if (filterIndex !== -1 && filterIndex < args.length - 1) {
      filter = args[filterIndex + 1];
    }
    
    await evaluate(model, filter);
  } else {
    console.error('Usage:');
    console.error('  npm run evaluate -- --model <model_name> [--filter <pattern>]     # Run evaluation');
    console.error('  npm run report                                                     # Generate report');
    console.error('  npm run fix <filename> [-- --model <model_name>]                  # Fix a test file');
    console.error('  npm run autofix -- <percentage> [--model <model_name>]            # Fix all files ≤ percentage');
    console.error('  npm run verify                                                     # Verify query behavior');
    console.error('\nExamples:');
    console.error('  npm run evaluate -- --model gpt-4o-mini --filter approve-po       # Only test files containing "approve-po"');
    console.error('  npm run evaluate -- --model claude-3-opus --filter 01-good        # Only test "01-good" files');
    console.error('  npm run fix approve-po-01-good.md                                  # Fix using default model (claude-opus-4.1)');
    console.error('  npm run fix approve-po-01-good.md -- --model gpt-4o               # Fix using specific model');
    console.error('  npm run autofix -- 50                                              # Fix all files with ≤50% correctness');
    console.error('  npm run autofix -- 0 --model gpt-4o                               # Fix 0% correct files with specific model');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});