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

Reports are saved in the `reports/` directory with timestamps.

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
2. **Prompt Construction**: For each test, it combines:
   - The SPEC.md's Prompt section (schema and requirements)
   - The evaluation prompt from `evaluation-prompt.txt`
   - The code fragment from the test file
3. **LLM Evaluation**: Sends the combined prompt to the specified model via OpenRouter
4. **Result Storage**: Stores the model's assessment and explanation in SQLite
5. **Reporting**: Generates HTML reports with accuracy metrics by model and application

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

## Troubleshooting

- **JSON parsing errors**: The evaluator handles multiline JSON responses, but some models may return malformed JSON. Check the console output for details.
- **Rate limiting**: The evaluator implements exponential backoff for rate limits. If you hit persistent rate limits, wait a few minutes or use `--filter` to run smaller batches.
- **Missing prompts**: Ensure each application directory has a `SPEC.md` file with a `# Prompt` section.
