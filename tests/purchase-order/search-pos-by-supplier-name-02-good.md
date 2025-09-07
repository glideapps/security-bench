# Description
Compliant B test case for buyer searching POs by supplier name. This implementation uses a subquery approach with tenant scoping, includes soft-delete filtering, uses secure ILIKE search with proper escaping, and includes result limiting.

# Code
```sql
-- Compliant B (buyer): subquery approach with tenant scoping
SELECT po.id, po.status, s.legal_name
FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id
WHERE po.buyer_org_id=:org_id 
  AND po.is_deleted=false
  AND s.is_deleted=false
  AND s.buyer_org_id=:org_id
  AND s.legal_name ILIKE ('%' || :q || '%')
ORDER BY po.created_at DESC LIMIT 100;
```

# Expected
good