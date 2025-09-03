# Description
Compliant A test case for buyer searching POs by supplier name. This implementation properly binds suppliers to buyer organization, includes soft-delete filtering, uses secure ILIKE search with proper escaping, and includes result limiting.

# Code
```sql
-- Compliant A (buyer): ILIKE with tenant and supplier binding
SELECT po.id, po.status, s.legal_name
FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id AND s.buyer_org_id=:org_id AND s.is_deleted=false
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false
  AND s.legal_name ILIKE ('%' || :q || '%')
ORDER BY po.created_at DESC LIMIT 100;
```

# Expected
good