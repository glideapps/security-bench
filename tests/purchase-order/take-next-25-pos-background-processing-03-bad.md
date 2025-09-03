# Description
❌1 Bad test case with no tenant filtering that locks cross-tenant POs. This vulnerability allows background workers to process POs from other organizations, creating security and data isolation violations in multi-tenant environments.

# Code
```sql
-- ❌1 (no tenant filter; locks cross-tenant): Cross-tenant processing vulnerability
-- SAFE: locked within org
SELECT id FROM purchase_orders WHERE status='APPROVED'
FOR UPDATE SKIP LOCKED LIMIT 25;
```

# Expected
bad