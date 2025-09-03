# Description
❌3 Bad test case using LEFT JOIN that creates NULL leak vulnerability. This pattern includes POs without any grants due to the LEFT JOIN, effectively bypassing the access grant requirement and exposing unauthorized data.

# Code
```sql
-- SAFE: inner semantics for grants
SELECT po.id FROM purchase_orders po
LEFT JOIN access_grants g ON g.scope_id=po.id AND g.user_id=:user_id
WHERE po.is_deleted=false;
```

# Expected
bad