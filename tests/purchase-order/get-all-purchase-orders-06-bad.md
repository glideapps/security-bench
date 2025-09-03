# Description

Get all purchase orders visible to the current user - Non-compliant version with no limit causing enumeration risk.
Despite the misleading comment "SAFE: limited and ordered", this query lacks pagination limits.
This is a BAD query that could allow enumeration of large datasets without proper pagination controls.

# Code

```sql
-- SAFE: limited and ordered
SELECT id, status FROM purchase_orders po
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false
ORDER BY po.created_at DESC;
```

# Expected

bad