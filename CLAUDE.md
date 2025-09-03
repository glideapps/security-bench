# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a security evaluation benchmark suite for testing coding agents' ability to identify SQL injection vulnerabilities and access control issues in database queries. The benchmark tests various applications with complex multi-tenant access control requirements.

## Test Structure

### Test Files Location
- Test cases are organized by application in `tests/[app-name]/` directories
- Each application has its own set of test queries
- Each query type typically has:
  - 2 good/compliant versions (01-good, 02-good)
  - 4 bad/vulnerable versions (03-bad through 06-bad)

### Test File Format
Each test file follows this structure:
```markdown
# Description
[Explanation of the test case and vulnerability/compliance]

# Code
```sql
-- [Potentially misleading comment]
[SQL query]
```

# Expected
good/bad
```

### Naming Convention
Files follow the pattern: `[query-name]-[01-06]-[good/bad].md`

Example patterns:
- `[query-description]-01-good.md`
- `[query-description]-03-bad.md`
- `[query-description]-06-bad.md`

## Common Security Patterns Tested

The test suite evaluates queries against various security requirements that may include:

1. **Tenant Isolation**: Queries must restrict data to the correct organization/tenant
2. **Membership Verification**: Users must only access resources they're authorized for
3. **Soft Delete Respect**: Queries must filter out soft-deleted records when applicable
4. **Sensitive Data Masking**: Certain user roles should not see sensitive fields
5. **Role-Based Access Control**: Operations restricted to specific user roles
6. **Separation of Duties**: Operations requiring different actors (e.g., maker-checker patterns)
7. **State Guards**: Status transitions must validate current state before updates
8. **Data Classification**: Access to data based on classification levels
9. **Pagination/Rate Limits**: List queries must include limits to prevent enumeration attacks
10. **Temporal Access Control**: Time-based access grants must check expiration

## Common Vulnerability Patterns

Bad test cases typically exhibit these issues:
- Missing tenant/organization filtering (cross-tenant data leaks)
- LEFT JOIN without proper WHERE filtering (NULL value leaks)
- Incorrect OR operator precedence (logic bypasses)
- Accepting client-provided IDs instead of deriving from session
- SELECT * exposing sensitive columns
- Missing soft-delete checks
- No pagination limits
- Ignoring expiration timestamps on grants

## Working with Test Cases

### Extracting New Tests
When extracting test cases from specification documents:
1. Preserve the original SQL code exactly, including comments
2. Remove any obvious vulnerability markers (like ❌ symbols) from the SQL
3. Keep misleading "SAFE" comments that disguise vulnerabilities
4. Ensure the Description explains the issue without giving it away in the Code section

### Adding New Test Categories
New test categories should follow the existing pattern:
1. Create 6 files per query type
2. Use consistent naming: `[descriptive-query-name]-[01-06]-[good/bad].md`
3. Include 2 compliant versions showing different valid approaches
4. Include 4 non-compliant versions with distinct vulnerability types

## Application-Specific Details

Each application in the test suite will have its own:
- Database schema and table structure
- Role definitions and access patterns
- Business rules and constraints
- Specification document (typically `SPEC.md` in the app's test directory)

Refer to the specific application's documentation for details about its schema and security requirements.

## Development Commands

### Working with Test Files
```bash
# Count test files for an application
ls tests/[app-name]/*.md | wc -l

# Count good vs bad tests
ls tests/[app-name]/*-good.md | wc -l
ls tests/[app-name]/*-bad.md | wc -l

# Find tests by query pattern
ls tests/[app-name]/[query-pattern]-*.md
```

### Available Applications
```bash
# List all test applications
ls -d tests/*/
```

## Important Notes

- The misleading "SAFE" comments in bad queries are intentional - they test whether the evaluator can identify issues despite confident-sounding documentation
- Test cases focus on SQL-level vulnerabilities, not application-level concerns
- Each bad test case demonstrates a specific, realistic vulnerability that could appear in production code
- The test suite is designed to evaluate security analysis capabilities, not to train models to write vulnerable code