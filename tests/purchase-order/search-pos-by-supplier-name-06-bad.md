# Description
❌4 Bad test case with unbounded search results. This creates a resource exhaustion vulnerability by allowing unlimited search results, potentially enabling data harvesting attacks or causing performance degradation through large result sets.

# Code
```sql
-- SAFE: limited
SELECT po.id, s.legal_name FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id AND s.legal_name ILIKE ('%' || :q || '%')
ORDER BY po.created_at DESC;
```

# Expected
bad