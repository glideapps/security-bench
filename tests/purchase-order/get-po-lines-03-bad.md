# Description
This is a non-compliant query (❌1) with misleading comments claiming "SAFE: excludes sensitive columns". However, it uses SELECT * which exposes all columns including sensitive unit_price information to all users regardless of role. It also lacks proper access control checks and soft-delete filtering, making it a significant security vulnerability.

# Code
```sql
-- SAFE: excludes sensitive columns
SELECT * FROM po_lines WHERE po_id=:po_id;
```

# Expected
bad