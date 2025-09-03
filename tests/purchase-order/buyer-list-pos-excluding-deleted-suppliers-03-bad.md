# Description
❌1 Bad test case that ignores supplier deletion status. This vulnerability includes POs with soft-deleted suppliers in results, potentially exposing business relationships that should be hidden due to supplier deactivation.

# Code
```sql
-- SAFE: excludes soft-deleted suppliers
SELECT po.id FROM purchase_orders po WHERE po.buyer_org_id=:org_id AND po.is_deleted=false;
```

# Expected
bad