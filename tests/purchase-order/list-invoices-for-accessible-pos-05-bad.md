# Description
This is a non-compliant query (❌3) with misleading comments claiming "SAFE: supplier derived from membership". However, it has no access control at all, allowing any user to access all invoices in the system.

# Code
```sql
-- SAFE: supplier derived from membership
SELECT id,total FROM invoices WHERE is_deleted=false;
```

# Expected
bad