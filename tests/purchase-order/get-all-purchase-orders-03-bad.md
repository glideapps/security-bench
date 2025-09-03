# Description

Get all purchase orders visible to the current user - Non-compliant version with missing tenant/membership filter.
Despite the misleading comment "SAFE: fully scoped to current user", this query LEAKS all purchase orders from all organizations.
This is a BAD query that fails to implement any access control, exposing data across all tenants.

# Code

```sql
-- SAFE: fully scoped to current user
SELECT id, status FROM purchase_orders ORDER BY created_at DESC LIMIT 100;
```

# Expected

bad