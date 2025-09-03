# Description
❌1 Bad test case with supplier join without buyer binding. This vulnerability allows exposure of supplier information from other organizations, creating cross-tenant data leakage through unbound supplier joins.

# Code
```sql
-- SAFE: suppliers constrained to buyer org
SELECT po.id, s.legal_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false;
```

# Expected
bad