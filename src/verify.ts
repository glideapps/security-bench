import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import isEqual from 'fast-deep-equal';
import { defined } from '@glideapps/ts-necessities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = dirname(__dirname);

// Convert named parameters (:name) to positional ($1, $2, etc.) for PGlite
function convertNamedToPositional(sql: string, params: Record<string, any>): { sql: string; values: any[] } {
  const paramNames: string[] = [];
  const values: any[] = [];
  
  // Find all :paramName patterns and replace with $N
  let convertedSql = sql;
  const matches = sql.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g);
  
  if (matches) {
    const uniqueMatches = [...new Set(matches)];
    
    for (const match of uniqueMatches) {
      const paramName = match.substring(1); // Remove the colon
      if (params.hasOwnProperty(paramName)) {
        paramNames.push(paramName);
        const index = paramNames.indexOf(paramName) + 1;
        // Replace all occurrences of this parameter
        convertedSql = convertedSql.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `$${index}`);
      }
    }
    
    // Build the values array in the correct order
    for (const paramName of paramNames) {
      values.push(params[paramName]);
    }
  }
  
  return { sql: convertedSql, values };
}

// Parse markdown file to extract code and expected sections
async function parseTestFile(filePath: string): Promise<{ code: string; expected: string } | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Extract code section
    const codeMatch = content.match(/# Code\s*\n\s*```(?:sql)?\s*\n([\s\S]*?)\n```/i);
    if (!codeMatch) {
      return null;
    }
    
    // Extract expected section
    const expectedMatch = content.match(/# Expected\s*\n\s*(good|bad)/i);
    if (!expectedMatch) {
      return null;
    }
    
    return {
      code: defined(codeMatch[1]).trim(),
      expected: defined(expectedMatch[1]).toLowerCase()
    };
  } catch (error) {
    console.error(`Error parsing test file ${filePath}:`, error);
    return null;
  }
}

// Parse parameter file to extract parameter sets and verify query
async function parseParameterFile(filePath: string): Promise<{ parameters: any[] | null; verifyQuery?: string } | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Extract parameters section
    const parametersMatch = content.match(/# Parameters\s*\n([\s\S]*?)(?=\n#|$)/i);
    if (!parametersMatch) {
      return null;
    }
    
    const parameters: any[] = [];
    const paramLines = defined(parametersMatch[1]).trim().split('\n');
    for (const line of paramLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.startsWith('{')) {
        try {
          parameters.push(JSON.parse(trimmedLine));
        } catch (e) {
          console.error(`Failed to parse parameter line: ${trimmedLine}`);
        }
      }
    }
    
    // Extract verify query if present
    const verifyMatch = content.match(/# Verify\s*\n\s*```(?:sql)?\s*\n([\s\S]*?)\n```/i);
    const verifyQuery = verifyMatch ? defined(verifyMatch[1]).trim() : undefined;
    
    return parameters.length > 0 ? { parameters, ...(verifyQuery !== undefined && { verifyQuery }) } : null;
  } catch (error) {
    // File doesn't exist or couldn't be read - that's ok
    return null;
  }
}

// Verify queries against actual databases
export async function verifyQueries(filter?: string) {
  console.log('\nVerifying query behavior against actual databases...\n');
  if (filter) {
    console.log(`Filtering tests by path containing: "${filter}"\n`);
  }
  let hasErrors = false;
  let errorCount = 0;
  const testsDir = join(PROJECT_ROOT, 'tests');
  const apps = await readdir(testsDir);
  
  for (const app of apps) {
    const appDir = join(testsDir, app);
    const indexPath = join(appDir, 'index.ts');
    
    // Check if index.ts exists
    try {
      await readFile(indexPath, 'utf-8');
    } catch (e) {
      if (!filter) {
        console.log(`Skipping ${app} (no index.ts found)`);
      }
      continue;
    }
    
    // If filter is provided, check if this app should be processed
    // We'll check both the app directory name and the parameter files inside
    if (filter) {
      // First check if the app directory matches
      const appMatches = appDir.includes(filter) || app.includes(filter);
      
      if (!appMatches) {
        // Check if any parameter files in this app match the filter
        const files = await readdir(appDir);
        const testFiles = files.filter(f => f.endsWith('.md') && f !== 'SPEC.md' && f !== 'QUERIES.md');
        const parameterFiles = testFiles.filter(f => !f.match(/-\d{2}-(good|bad)\.md$/));
        const hasMatchingParamFile = parameterFiles.some(f => f.includes(filter));
        
        if (!hasMatchingParamFile) {
          continue; // Skip this app entirely
        }
      }
    }
    
    // Check if the app-level matches the filter
    const appMatchesFilter = !filter || appDir.includes(filter) || app.includes(filter);
    
    console.log(`\n=== Verifying ${app} ===\n`);
    
    // Dynamically import the database setup
    const dbModule = await import(indexPath);
    if (!dbModule.createDatabase) {
      console.error(`${app}/index.ts does not export createDatabase function`);
      continue;
    }
    
    const db = await dbModule.createDatabase();
    
    // Get all .md files in the directory
    const files = await readdir(appDir);
    const testFiles = files.filter(f => f.endsWith('.md') && f !== 'SPEC.md' && f !== 'QUERIES.md');
    
    // Find parameter files (files without -NN-good/bad pattern)
    const parameterFiles = testFiles.filter(f => !f.match(/-\d{2}-(good|bad)\.md$/));
    
    for (const paramFile of parameterFiles) {
      const queryType = paramFile.replace('.md', '');
      const paramFilePath = join(appDir, paramFile);
      
      // If app matches filter, run all tests in it
      // Otherwise, only run tests where the parameter file matches the filter
      if (filter && !appMatchesFilter) {
        if (!paramFile.includes(filter) && !queryType.includes(filter)) {
          continue;
        }
      }
      
      // Parse parameter file
      const parsed = await parseParameterFile(paramFilePath);
      if (!parsed || !parsed.parameters || parsed.parameters.length === 0) {
        continue;
      }
      const parameters = parsed.parameters;
      const verifyQuery = parsed.verifyQuery;
      
      console.log(`\nTesting query type: ${queryType}`);
      console.log(`  Found ${parameters.length} parameter set(s)`);
      
      // Find all test files for this query type
      const pattern = new RegExp(`^${queryType}-\\d{2}-(good|bad)\\.md$`);
      const queryTestFiles = testFiles.filter(f => pattern.test(f));
      
      if (queryTestFiles.length === 0) {
        console.log(`  No test files found for ${queryType}`);
        continue;
      }
      
      // Separate good and bad queries
      const goodQueries: { file: string; code: string }[] = [];
      const badQueries: { file: string; code: string }[] = [];
      
      for (const testFile of queryTestFiles.sort()) {
        const testFilePath = join(appDir, testFile);
        const parsed = await parseTestFile(testFilePath);
        if (!parsed) continue;
        
        const queryData = {
          file: testFile,
          code: parsed.code
        };
        
        if (parsed.expected === 'good') {
          goodQueries.push(queryData);
        } else {
          badQueries.push(queryData);
        }
      }
      
      console.log(`  Found ${goodQueries.length} good and ${badQueries.length} bad queries`);
      
      if (goodQueries.length === 0) {
        console.log(`  ⚠ No good queries to compare against`);
        continue;
      }
      
      // Run good queries and collect results for each parameter set
      const goodResults: Map<string, any[]> = new Map();
      let goodQueryErrors = false;
      
      for (const goodQuery of goodQueries) {
        console.log(`\n  Running ${goodQuery.file}:`);
        
        // Check if query modifies data (but not SELECT...FOR UPDATE)
        const modifiesData = /INSERT\s+INTO|DELETE\s+FROM|^\s*UPDATE\s+\w+\s+SET/im.test(goodQuery.code);
        
        for (let i = 0; i < parameters.length; i++) {
          const params = parameters[i];
          try {
            // Create fresh database for modifying queries
            let queryDb = db;
            if (modifiesData) {
              queryDb = await dbModule.createDatabase();
            }
            
            // Convert named parameters to positional for PGlite
            const { sql, values } = convertNamedToPositional(goodQuery.code, params);
            const result = await queryDb.query(sql, values);
            
            // For INSERT/DELETE/UPDATE with verify query, run the verify query to check results
            let resultToStore: any;
            if (modifiesData && verifyQuery) {
              // Run the verify query to see what was actually changed
              const { sql: verifySql, values: verifyValues } = convertNamedToPositional(verifyQuery, params);
              const verifyResult = await queryDb.query(verifySql, verifyValues);
              resultToStore = verifyResult.rows;
            } else if (modifiesData) {
              // For modifying queries without verify, store the number of affected rows
              resultToStore = { affectedRows: result.affectedRows || 0 };
            } else {
              // For SELECT queries, store the actual rows
              resultToStore = result.rows;
            }
            
            // Close fresh database if we created one
            if (modifiesData) {
              await queryDb.close();
            }
            
            const key = `param_set_${i}`;
            if (!goodResults.has(key)) {
              goodResults.set(key, []);
            }
            goodResults.get(key)!.push(resultToStore);
            
            if (modifiesData && verifyQuery) {
              console.log(`    ✓ Parameter set ${i + 1}: ${resultToStore.length} rows (verified)`);
            } else if (modifiesData) {
              console.log(`    ✓ Parameter set ${i + 1}: ${result.affectedRows || 0} rows affected`);
            } else {
              console.log(`    ✓ Parameter set ${i + 1}: ${result.rows.length} rows`);
            }
          } catch (e: any) {
            console.log(`    ✗ Parameter set ${i + 1}: ERROR - ${e.message}`);
            goodQueryErrors = true;
            hasErrors = true;
            errorCount++;
            
            // Store error as a special result so we can detect inconsistency
            const key = `param_set_${i}`;
            if (!goodResults.has(key)) {
              goodResults.set(key, []);
            }
            goodResults.get(key)!.push({ __error__: true, message: e.message });
          }
        }
      }
      
      // If any good query had errors, that's a failure
      if (goodQueryErrors) {
        console.log(`\n  ✗ ERROR: Good queries failed to execute properly`);
      }
      
      // Check that all good queries produce the same results for each parameter set
      let allGoodMatch = true;
      for (const [paramKey, results] of goodResults) {
        if (results.length > 1) {
          const firstResult = results[0];
          for (let i = 1; i < results.length; i++) {
            if (!isEqual(results[i], firstResult)) {
              console.log(`\n  ✗ MISMATCH: Good queries produce different results for ${paramKey}`);
              allGoodMatch = false;
              hasErrors = true;
              errorCount++;
              break;
            }
          }
        }
      }
      
      if (allGoodMatch && goodQueries.length > 1 && !goodQueryErrors) {
        console.log(`\n  ✓ All good queries produce identical results`);
      }
      
      // Run bad queries and check for differences
      for (const badQuery of badQueries) {
        console.log(`\n  Running ${badQuery.file}:`);
        let foundDifference = false;
        
        // Check if query modifies data
        const modifiesData = /INSERT\s+INTO|DELETE\s+FROM|^\s*UPDATE\s+\w+\s+SET/im.test(badQuery.code);
        
        for (let i = 0; i < parameters.length; i++) {
          const params = parameters[i];
          try {
            // Create fresh database for modifying queries
            let queryDb = db;
            if (modifiesData) {
              queryDb = await dbModule.createDatabase();
            }
            
            // Convert named parameters to positional for PGlite
            const { sql, values } = convertNamedToPositional(badQuery.code, params);
            const result = await queryDb.query(sql, values);
            
            // For INSERT/DELETE/UPDATE with verify query, run the verify query to check results
            let resultToCompare: any;
            if (modifiesData && verifyQuery) {
              // Run the verify query to see what was actually changed
              const { sql: verifySql, values: verifyValues } = convertNamedToPositional(verifyQuery, params);
              const verifyResult = await queryDb.query(verifySql, verifyValues);
              resultToCompare = verifyResult.rows;
            } else if (modifiesData) {
              // For modifying queries without verify, compare affected rows
              resultToCompare = { affectedRows: result.affectedRows || 0 };
            } else {
              resultToCompare = result.rows;
            }
            
            // Close fresh database if we created one
            if (modifiesData) {
              await queryDb.close();
            }
            
            const goodResultsForParam = goodResults.get(`param_set_${i}`);
            if (goodResultsForParam && goodResultsForParam.length > 0) {
              const expectedGoodResult = goodResultsForParam[0];
              
              // Check if the good query had an error
              if (expectedGoodResult && expectedGoodResult.__error__) {
                // Good query errored, bad query succeeded - that's a difference
                console.log(`    ✓ Parameter set ${i + 1}: DIFFERS from good (good query errored, bad succeeded)`);
                foundDifference = true;
              } else if (!isEqual(resultToCompare, expectedGoodResult)) {
                if (modifiesData && verifyQuery) {
                  console.log(`    ✓ Parameter set ${i + 1}: DIFFERS from good (verified data)`);
                } else if (modifiesData) {
                  console.log(`    ✓ Parameter set ${i + 1}: DIFFERS from good (${result.affectedRows || 0} rows affected vs expected)`);
                } else {
                  console.log(`    ✓ Parameter set ${i + 1}: DIFFERS from good (${result.rows.length} rows vs expected)`);
                }
                foundDifference = true;
              } else {
                console.log(`    ✗ Parameter set ${i + 1}: SAME as good query (vulnerability not exposed)`);
              }
            }
          } catch (e: any) {
            // Check if the good query also errored
            const goodResultsForParam = goodResults.get(`param_set_${i}`);
            if (goodResultsForParam && goodResultsForParam.length > 0) {
              const expectedGoodResult = goodResultsForParam[0];
              if (expectedGoodResult && expectedGoodResult.__error__) {
                // Both errored - could be same or different error
                console.log(`    ⚠ Parameter set ${i + 1}: ERROR (both queries errored) - ${e.message}`);
                // Consider it the same if both error (might need to refine this)
                foundDifference = false;
              } else {
                // Bad errored but good succeeded - that's a difference
                console.log(`    ✓ Parameter set ${i + 1}: DIFFERS from good (bad errored, good succeeded) - ${e.message}`);
                foundDifference = true;
              }
            } else {
              console.log(`    ⚠ Parameter set ${i + 1}: ERROR - ${e.message}`);
              foundDifference = true; // Error counts as different behavior
            }
          }
        }
        
        if (!foundDifference) {
          console.log(`  ✗ WARNING: ${badQuery.file} produces same results as good queries for all parameters`);
          hasErrors = true;
          errorCount++;
        }
      }
    }
    
    // Close database connection
    await db.close();
  }
  
  if (hasErrors) {
    console.log(`\n❌ Verification failed with ${errorCount} error(s)\n`);
    process.exit(1);
  } else {
    console.log('\n✅ Verification complete\n');
  }
}