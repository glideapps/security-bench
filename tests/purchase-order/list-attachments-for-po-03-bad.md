# Description
This is a non-compliant query (❌1) with misleading comments claiming "SAFE: classification enforced elsewhere". However, it completely lacks classification filtering for suppliers, meaning suppliers could see all attachment classifications including sensitive ones. It also lacks proper access control checks and soft-delete filtering.

# Code
```sql
-- ❌1 (no classification filter for suppliers)
-- SAFE: classification enforced elsewhere
SELECT id, filename, classification FROM attachments WHERE po_id=:po_id;
```

# Expected
bad