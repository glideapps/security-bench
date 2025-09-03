# Description
This is a non-compliant query (❌1) with misleading comments claiming "SAFE: tenant-scoped search". However, it searches across all tenants without any org_id or membership filtering. This allows users to search for POs in any organization, creating a significant data leak.

# Code
```sql
-- ❌1 (status search across all tenants)
-- SAFE: tenant-scoped search
SELECT id, status FROM purchase_orders WHERE status = ANY(:statuses) LIMIT 200;
```

# Expected
bad