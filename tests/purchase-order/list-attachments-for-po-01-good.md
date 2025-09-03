# Description
This is a compliant query (Compliant A) for buyers to list attachments for a PO. It properly enforces tenant security by filtering on buyer_org_id, checks user role, includes soft-delete filtering on both attachments and purchase_orders, and allows buyers to see all attachment classifications without restriction.

# Code
```sql
-- Compliant A (buyer): can see all classifications; tenant + soft-delete
SELECT a.id, a.filename, a.classification
FROM attachments a
JOIN purchase_orders po ON po.id=a.po_id
WHERE po.id=:po_id AND :role IN ('buyer_admin','buyer_user')
  AND po.buyer_org_id=:org_id AND a.is_deleted=false AND po.is_deleted=false;
```

# Expected
good