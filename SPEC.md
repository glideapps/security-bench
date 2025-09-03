# Security Benchmark Evaluator Specification

## Overview

A CLI tool that evaluates LLM security analysis capabilities by testing their ability to identify vulnerabilities in code fragments. The tool sends test cases to LLMs via OpenRouter and records their performance in a SQLite database. While initially focused on SQL queries, the system is designed to support other languages and frameworks in the future.

## System Components

### 1. CLI Evaluator

**Command**: `npm run evaluate -- --model <model_name>`

**Functionality**:
- Takes a model name parameter (must be available on OpenRouter)
- Iterates through all applications in `tests/` directory
- For each application, processes all `.md` test files
- Sends each test case to the specified LLM for evaluation
- Records results in SQLite database

**Process Flow**:
1. Parse command line arguments to get model name
2. Initialize SQLite database connection
3. For each directory in `tests/`:
   - Read the `SPEC.md` file to get the "Prompt" section (database schema and security requirements)
   - For each `.md` file in the directory (excluding SPEC.md):
     - Extract the code from the "# Code" section
     - Combine: SPEC.md prompt + code fragment + evaluation prompt
     - Send combined prompt to LLM
     - Compare LLM response with expected value from "# Expected" section
     - Record result in database
     - Log all errors to console

### 2. Report Generator

**Command**: `npm run report`

**Functionality**:
- Reads all evaluation results from SQLite database
- Generates an HTML report showing:
  - Results grouped by model
  - Results grouped by application
  - Overall accuracy percentages
  - Individual test case results with pass/fail status

### 3. Database Schema

**Table**: `evaluations`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-incrementing ID |
| timestamp | DATETIME | When the evaluation was run |
| test_file | TEXT | Full path to the test file |
| model_name | TEXT | Name of the model used |
| expected_result | TEXT | Expected result from test file ("good" or "bad") |
| actual_result | TEXT | Model's assessment ("good" or "bad") |
| explanation | TEXT | Model's explanation for its assessment |

### 4. LLM Prompt Construction

For each test case, the prompt is constructed from three parts:

1. **SPEC.md Prompt Section**: The content under the "# Prompt" heading from the application's SPEC.md file
2. **Test Code**: The content under the "# Code" heading from the individual test file
3. **Evaluation Prompt**: Loaded from `evaluation-prompt.txt` in the project root

Example combined prompt:
```
[Content from SPEC.md # Prompt section]

[Content from evaluation-prompt.txt]

[Code from test file # Code section]
```

The LLM is instructed to use structured JSON output and must return a JSON object with the following schema:
```json
{
  "assessment": "good" | "bad",
  "explanation": "string explaining the reasoning"
}
```

## Implementation Requirements

### Technology Stack
- Node.js 24 with built-in TypeScript support
- TypeScript for all source files

### Dependencies
- `dotenv` - For loading environment variables from `.env`
- `sqlite3` or `better-sqlite3` - For SQLite database operations
- Node's built-in `fetch` - For OpenRouter API calls
- Node's built-in `fs/promises` - For file operations
- Node's built-in `path` - For path manipulation

### Configuration
- OpenRouter API key should be read from `.env` file: `OPENROUTER_API_KEY`
- Database file location: `results.db` in project root
- Evaluation prompt: `evaluation-prompt.txt` in project root

### Error Handling
- All errors must be logged to console using `console.error()`
- Skip test files that cannot be parsed (log error and continue)
- Log API errors but continue processing other tests
- Handle rate limiting with exponential backoff

## File Structure

```
security-bench/
├── src/
│   └── evaluator.ts     # Main CLI tool (TypeScript source)
├── package.json         # NPM configuration with scripts
├── .env                 # Environment variables (OPENROUTER_API_KEY)
├── evaluation-prompt.txt # Final evaluation prompt template
├── results.db           # SQLite database (created on first run)
├── reports/             # Generated HTML reports
│   └── report_YYYY-MM-DD_HH-MM-SS.html
└── tests/               # Test cases (existing)
    ├── purchase-order/
    │   ├── SPEC.md      # Contains # Prompt section with schema/requirements
    │   └── *.md         # Individual test files
    └── warehouse-management-system/
        ├── SPEC.md      # Contains # Prompt section with schema/requirements
        └── *.md         # Individual test files
```

## Usage Examples

### Run evaluation
```bash
# Evaluate using GPT-4
npm run evaluate -- --model gpt-4

# Evaluate using Claude
npm run evaluate -- --model anthropic/claude-3-opus
```

### Generate report
```bash
npm run report
# Creates: reports/report_2024-01-15_14-30-00.html
```

### NPM Scripts (in package.json)
```json
{
  "scripts": {
    "evaluate": "node --experimental-strip-types src/evaluator.ts",
    "report": "node --experimental-strip-types src/evaluator.ts --report"
  }
}
```

## Success Metrics

The system should:
1. Successfully parse all test files in the `tests/` directory
2. Make API calls to OpenRouter with appropriate prompts
3. Correctly identify whether model responses match expected results
4. Store all evaluation data in the database
5. Generate readable HTML reports showing model performance

## Out of Scope

The following features are explicitly NOT included in this version:
- Parallel processing of test cases
- Retry logic for individual test failures
- Model comparison in single run
- Cost tracking
- Response time measurements
- Detailed error analysis
- Test case categorization beyond app grouping
