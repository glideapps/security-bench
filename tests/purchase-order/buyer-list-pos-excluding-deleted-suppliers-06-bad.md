# Description
❌4 Bad test case with OR logic that creates constraint bypass. This vulnerability uses OR conditions that allow either PO tenant matching OR supplier validation, effectively bypassing both constraints and exposing unauthorized data.

# Code
```sql
-- SAFE: both PO and supplier constrained
SELECT po.id FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id OR s.is_deleted=false;
```

# Expected
bad