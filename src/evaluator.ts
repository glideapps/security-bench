import { config } from 'dotenv';
import Database from 'better-sqlite3';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
  code: string
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
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a security expert evaluating code for vulnerabilities. You will be given a database schema, security requirements, and a code fragment to analyze.'
          },
          {
            role: 'user',
            content: specPrompt
          },
          {
            role: 'user',
            content: evaluationPrompt
          },
          {
            role: 'user',
            content: code
          }
        ],
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
        max_tokens: 500
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
      const content = responseData.choices[0]?.message?.content;
      
      if (!content) {
        console.error('No content in OpenRouter response');
        return null;
      }

      try {
        const result = JSON.parse(content);
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
  
  for (const testFile of testFiles) {
    const testFilePath = join(appDir, testFile);
    await processTestFile(testFilePath, specPrompt, evaluationPrompt, model);
  }
}

// Main evaluation function
async function evaluate(model: string, filter?: string): Promise<void> {
  console.log(`Starting evaluation with model: ${model}`);
  if (filter) {
    console.log(`Filter: "${filter}"`);
  }
  
  // Load evaluation prompt
  const evaluationPromptPath = join(PROJECT_ROOT, 'evaluation-prompt.txt');
  const evaluationPrompt = await readFile(evaluationPromptPath, 'utf-8');
  
  // Get all test applications
  const testsDir = join(PROJECT_ROOT, 'tests');
  const apps = await readdir(testsDir);
  
  for (const app of apps) {
    const appDir = join(testsDir, app);
    const stats = await import('fs').then(fs => fs.promises.stat(appDir));
    if (stats.isDirectory()) {
      await processApplication(appDir, model, evaluationPrompt, filter);
    }
  }
  
  console.log('\nEvaluation complete!');
}

// Generate HTML report
async function generateReport(): Promise<void> {
  const reportDir = join(PROJECT_ROOT, 'reports');
  await import('fs').then(fs => fs.promises.mkdir(reportDir, { recursive: true }));
  
  // Query all results
  const allResults = db.prepare(`
    SELECT * FROM evaluations
    ORDER BY timestamp DESC, test_file
  `).all();
  
  // Group by model
  const byModel: Record<string, any[]> = {};
  // Group by application
  const byApp: Record<string, any[]> = {};
  
  for (const result of allResults as any[]) {
    // Group by model
    if (!byModel[result.model_name]) {
      byModel[result.model_name] = [];
    }
    byModel[result.model_name].push(result);
    
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
  
  // Generate HTML
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = join(reportDir, `report_${timestamp}.html`);
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Benchmark Report - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .stats { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #007acc; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f5f5f5; }
    .correct { color: green; font-weight: bold; }
    .incorrect { color: red; font-weight: bold; }
    .model-section { margin: 30px 0; padding: 20px; background: #fafafa; border-radius: 5px; }
    .percentage { font-size: 24px; font-weight: bold; }
    .good { background: #d4f8d4; }
    .bad { background: #f8d4d4; }
    details { margin: 10px 0; }
    summary { cursor: pointer; padding: 5px; background: #e8e8e8; border-radius: 3px; }
    summary:hover { background: #d8d8d8; }
    .explanation { margin: 10px 20px; padding: 10px; background: #f9f9f9; border-left: 3px solid #007acc; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Security Benchmark Evaluation Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="stats">
      <h2>Overall Statistics</h2>`;
  
  for (const [model, stats] of Object.entries(modelStats)) {
    html += `
      <div class="model-section">
        <h3>${model}</h3>
        <p class="percentage">${stats.percentage.toFixed(1)}%</p>
        <p>Correct: ${stats.correct} / ${stats.total}</p>
      </div>`;
  }
  
  html += `</div>`;
  
  // Results by model
  html += `<h2>Results by Model</h2>`;
  for (const [model, results] of Object.entries(byModel)) {
    const stats = modelStats[model];
    html += `
    <div class="model-section">
      <h3>${model} (${stats.percentage.toFixed(1)}% accuracy)</h3>
      <table>
        <thead>
          <tr>
            <th>Test File</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>`;
    
    for (const result of results) {
      const correct = result.expected_result === result.actual_result;
      const fileName = result.test_file.split('/').pop();
      html += `
          <tr>
            <td>${fileName}</td>
            <td class="${result.expected_result}">${result.expected_result}</td>
            <td class="${result.actual_result}">${result.actual_result}</td>
            <td class="${correct ? 'correct' : 'incorrect'}">${correct ? '✓' : '✗'}</td>
          </tr>`;
    }
    
    html += `
        </tbody>
      </table>
    </div>`;
  }
  
  // Results by application
  html += `<h2>Results by Application</h2>`;
  for (const [app, results] of Object.entries(byApp)) {
    const correct = results.filter((r: any) => r.expected_result === r.actual_result).length;
    const percentage = results.length > 0 ? (correct / results.length) * 100 : 0;
    
    html += `
    <div class="model-section">
      <h3>${app} (${percentage.toFixed(1)}% accuracy across all models)</h3>
      <details>
        <summary>View Details (${correct}/${results.length} correct)</summary>
        <table>
          <thead>
            <tr>
              <th>Test File</th>
              <th>Model</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const result of results as any[]) {
      const correct = result.expected_result === result.actual_result;
      const fileName = result.test_file.split('/').pop();
      html += `
            <tr>
              <td>${fileName}</td>
              <td>${result.model_name}</td>
              <td class="${result.expected_result}">${result.expected_result}</td>
              <td class="${result.actual_result}">${result.actual_result}</td>
              <td class="${correct ? 'correct' : 'incorrect'}">${correct ? '✓' : '✗'}</td>
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
  console.log(`Report generated: ${reportPath}`);
}

// Main CLI entry point
async function main() {
  const args = process.argv.slice(2);
  
  // Initialize database
  initializeDatabase();
  
  if (args.includes('--report')) {
    await generateReport();
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
    console.error('  npm run evaluate -- --model <model_name> [--filter <pattern>]  # Run evaluation');
    console.error('  npm run report                                                  # Generate report');
    console.error('\nExamples:');
    console.error('  npm run evaluate -- --model gpt-4o-mini --filter approve-po    # Only test files containing "approve-po"');
    console.error('  npm run evaluate -- --model claude-3-opus --filter 01-good     # Only test "01-good" files');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});