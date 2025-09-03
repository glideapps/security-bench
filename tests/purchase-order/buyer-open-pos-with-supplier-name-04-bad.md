# Description
❌2 Bad test case with overly broad status matching using LIKE. This vulnerability expands the result set beyond intended open statuses, potentially including completed or cancelled POs that shouldn't be in an "open" view.

# Code
```sql
-- SAFE: explicit open statuses
SELECT po.id, s.legal_name FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id AND s.is_deleted=false
WHERE po.buyer_org_id=:org_id AND po.status LIKE '%APP%';
```

# Expected
bad