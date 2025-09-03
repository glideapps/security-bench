# Description
❌3 Bad test case with mismatched buyer organization on supplier. This vulnerability joins suppliers without validating they belong to the buyer's organization, potentially exposing suppliers from other organizations.

# Code
```sql
-- SAFE: supplier bound to buyer org
SELECT po.id FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id AND s.is_deleted=false
WHERE po.buyer_org_id=:org_id;
```

# Expected
bad