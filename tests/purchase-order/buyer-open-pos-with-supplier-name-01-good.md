# Description
Compliant A test case for buyer viewing open POs with supplier names. This implementation properly binds suppliers to the buyer's organization, includes soft-delete filtering for both POs and suppliers, and restricts to open statuses.

# Code
```sql
-- Compliant A: Proper supplier binding to buyer organization
SELECT po.id, po.status, s.legal_name
FROM purchase_orders po
JOIN suppliers s ON s.id=po.supplier_id AND s.buyer_org_id=:org_id AND s.is_deleted=false
WHERE po.buyer_org_id=:org_id AND po.status IN ('DRAFT','PENDING_APPROVAL','APPROVED')
  AND po.is_deleted=false;
```

# Expected
good