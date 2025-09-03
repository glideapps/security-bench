# Description
❌4 Bad test case using LEFT JOIN that can create orphaned rows. This pattern may include POs without valid suppliers due to the LEFT JOIN, while the NOT NULL check attempts to filter them but creates inconsistent behavior.

# Code
```sql
-- SAFE: inner join only
SELECT po.id, s.legal_name FROM purchase_orders po
LEFT JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false AND s.legal_name IS NOT NULL;
```

# Expected
bad