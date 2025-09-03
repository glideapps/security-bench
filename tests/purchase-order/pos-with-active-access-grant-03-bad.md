# Description
❌1 Bad test case that ignores grant expiry. This vulnerability allows access using expired grants, potentially exposing POs to users who should no longer have access due to time-based restrictions.

# Code
```sql
-- SAFE: only active grants
SELECT po.id FROM purchase_orders po
WHERE EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id=:user_id);
```

# Expected
bad