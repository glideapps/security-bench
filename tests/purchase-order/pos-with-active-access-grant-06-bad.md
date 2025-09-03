# Description
❌4 Bad test case with expired grants included via OR logic error. This implementation uses faulty OR precedence that includes expired grants or any non-deleted PO, effectively bypassing the access grant validation entirely.

# Code
```sql
-- SAFE: expiry enforced
SELECT po.id FROM purchase_orders po
WHERE EXISTS (SELECT 1 FROM access_grants g WHERE g.user_id=:user_id) OR po.is_deleted=false;
```

# Expected
bad