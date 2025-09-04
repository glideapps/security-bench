# Security Benchmark Suite

A comprehensive evaluation framework for testing Large Language Models' ability to identify security vulnerabilities in code, with a focus on SQL injection, access control, and multi-tenant data isolation issues.

## Overview

This benchmark suite evaluates how well LLMs can detect security vulnerabilities in database queries and other code fragments. It tests various security patterns including:

- SQL injection vulnerabilities
- Cross-tenant data leakage
- Missing access control checks
- Improper handling of soft-deleted records
- Exposure of sensitive fields
- Missing pagination limits
- Incorrect permission validations
- State transition guards
- Temporal access control

## Setup

### Prerequisites

- Node.js 24+ (with built-in TypeScript support)
- An OpenRouter API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your OpenRouter API key in `.env`:
   ```
   OPENROUTER_API_KEY=your-api-key-here
   ```

## Running Evaluations

### Evaluate a Model

Run the full benchmark suite against a specific model:

```bash
npm run evaluate -- --model gpt-4o-mini
```

Run a filtered subset of tests:

```bash
# Only run tests matching a pattern
npm run evaluate -- --model claude-3-opus --filter approve-po

# Only run "good" test cases
npm run evaluate -- --model gpt-4o-mini --filter 01-good
```

### Generate Reports

Generate an HTML report from evaluation results:

```bash
npm run report
```

Reports are saved in the `reports/` directory with timestamps. Each report includes:
- Summary statistics showing overall accuracy percentages
- Results grouped by model with individual test file links
- Results grouped by application showing performance across all models
- Detailed pages for each test file showing all evaluations

### Fix Test Files

The fix command can automatically rewrite test code when a model's assessment differs from the expected result:

```bash
# Fix using default model (anthropic/claude-opus-4.1)
npm run fix approve-po-01-good.md

# Fix using a specific model
npm run fix approve-po-01-good.md -- --model gpt-4o

# Fix using full or relative path
npm run fix tests/purchase-order/approve-po-01-good.md
```

How it works:
1. Retrieves any previous evaluation results for context
2. **Deletes all existing database entries for that test file**
3. Evaluates the test file with the specified model
4. If the assessment matches expected: reports no fix needed
5. If the assessment differs: asks the model to rewrite the code to match expectations
6. Updates the test file with corrected code
7. Verifies the fix by re-evaluating

The fix command will:
- Make vulnerable code secure (if expected is "good")
- Introduce realistic vulnerabilities (if expected is "bad")
- Add appropriate SQL comments (accurate for secure code, misleading for vulnerable code)

### Batch Fix with Autofix

The autofix command finds and fixes multiple test files based on their correctness percentage:

```bash
# Fix all files with ≤50% correctness using default model
npm run autofix -- 50

# Fix all files with 0% correctness (completely failing)
npm run autofix -- 0

# Use a specific model for autofix
npm run autofix -- 30 --model gpt-4o
```

How it works:
1. Queries the database for all test files with correctness ≤ the specified percentage
2. Shows a summary of files to be fixed with their current accuracy
3. For >10 files, prompts for confirmation (in interactive terminals only)
4. Processes each file sequentially:
   - Shows progress indicator `[n/total]`
   - Calls the fix logic (including DB cleanup)
   - Continues on error
5. Displays final summary with success/failure counts

Example output:
```
Finding test files with ≤50% correctness...

Found 3 files to fix:
  - approve-po-03-bad.md (0.0% correct, 0/2)
  - buyer-approval-queue-04-bad.md (25.0% correct, 1/4)
  - get-messages-in-po-05-bad.md (50.0% correct, 1/2)

Starting autofix with model: anthropic/claude-opus-4.1

[1/3] Fixing approve-po-03-bad.md (0.0% correct)
...
[2/3] Fixing buyer-approval-queue-04-bad.md (25.0% correct)
...
[3/3] Fixing get-messages-in-po-05-bad.md (50.0% correct)
...

========================================
Autofix complete!
  ✓ Successfully fixed: 3
========================================
```

## Adding New Benchmarks

### Directory Structure

Each benchmark application lives in `tests/<app-name>/` with:
- `SPEC.md` - Application specification with schema and security requirements
- Individual test files following the naming pattern: `<query-name>-<01-06>-<good|bad>.md`

### Creating a New Application Benchmark

1. **Create the application directory:**
   ```bash
   mkdir tests/my-new-app
   ```

2. **Write the SPEC.md file:**
   ```markdown
   # Application Name

   Description of the application...

   # Prompt

   ## Schema (Postgres)

   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     org_id UUID NOT NULL,
     ...
   );
   ```

   ## Security Requirements

   1. All queries must filter by organization ID
   2. Soft-deleted records must be excluded
   3. ...
   ```

3. **Create test cases** following the naming convention:
   - 2 good examples: `query-name-01-good.md`, `query-name-02-good.md`
   - 4 bad examples: `query-name-03-bad.md` through `query-name-06-bad.md`

### Test File Format

Each test file must follow this structure:

```markdown
# Description
Explanation of what this test case validates or the vulnerability it contains.

# Code
```sql
-- SQL query or code fragment
SELECT * FROM users WHERE id = $1;
```

# Expected
good
```

Or for vulnerable code:

```markdown
# Description
This query is missing tenant isolation, allowing cross-tenant data access.

# Code
```sql
-- SAFE: User lookup query
SELECT * FROM users WHERE id = $1;
```

# Expected
bad
```

### Guidelines for Test Cases

1. **Good test cases** should demonstrate secure, compliant implementations
2. **Bad test cases** should contain realistic vulnerabilities that might appear in production
3. Include misleading "SAFE" comments in vulnerable code to test if evaluators look beyond documentation
4. Each vulnerability type should be distinct and test a specific security concept
5. Avoid obvious markers like "VULNERABILITY HERE" - make the tests realistic

### Supporting Multiple Languages

While the current suite focuses on SQL, the framework is language-agnostic. To add tests for other languages:

1. Use the same directory structure and file format
2. Update the code blocks with the appropriate language identifier
3. Adjust the security requirements in SPEC.md accordingly

Example for JavaScript:

```markdown
# Code
```javascript
// User authentication endpoint
app.get('/api/user/:id', (req, res) => {
  const user = db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`);
  res.json(user);
});
```
```

## How It Works

1. **Test Discovery**: The evaluator scans the `tests/` directory for applications
2. **Prompt Construction**: For each test, it sends three separate messages:
   - The SPEC.md's Prompt section (schema and requirements)
   - The evaluation prompt from `evaluation-prompt.txt`
   - The code fragment from the test file
3. **LLM Evaluation**: 
   - Sends the combined prompt to the specified model via OpenRouter
   - Uses structured JSON output for consistent responses
   - Processes up to 5 concurrent API requests per application
4. **Result Storage**: Stores the model's assessment and explanation in SQLite
5. **Reporting**: Generates HTML reports with:
   - Overall statistics and accuracy percentages
   - Results grouped by model and application
   - Individual pages for each test file with full details

## Database Schema

Results are stored in `results.db` with the following schema:

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | DATETIME | When the evaluation was run |
| test_file | TEXT | Full path to the test file |
| model_name | TEXT | Name of the model used |
| expected_result | TEXT | Expected result ("good" or "bad") |
| actual_result | TEXT | Model's assessment |
| explanation | TEXT | Model's reasoning |
| request | TEXT | Complete API request body (JSON) |
| response | TEXT | Complete API response body (JSON) |

Key features:
- **Deduplication**: The evaluator checks for existing results before making API calls
- **Full audit trail**: Request/response bodies are stored for debugging
- **Cleanup on fix**: The fix and autofix commands delete all existing entries for a file before rewriting

## Troubleshooting

- **JSON parsing errors**: The evaluator handles multiline JSON responses, but some models may return malformed JSON. Check the console output for details.
- **Rate limiting**: The evaluator implements exponential backoff for rate limits. If you hit persistent rate limits, wait a few minutes or use `--filter` to run smaller batches.
- **Missing prompts**: Ensure each application directory has a `SPEC.md` file with a `# Prompt` section.
- **"No content in OpenRouter response"**: Some models like `google/gemini-2.5-pro` use extensive reasoning that may exhaust the default token limit. The evaluator automatically sets 30,000 max tokens for these models.
- **Autofix confirmation prompts**: For safety, autofix requires confirmation when processing >10 files. Run in an interactive terminal or process smaller batches.
