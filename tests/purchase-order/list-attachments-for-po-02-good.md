# Description
This is a compliant query (Compliant B) for buyers to list attachments for a PO. It uses an alternative approach with EXISTS clause to verify buyer organization membership, includes soft-delete filtering on both entities, and allows buyers to see all attachment classifications.

# Code
```sql
-- Compliant B (buyer): alternative approach using EXISTS for org check
SELECT a.id, a.filename, a.classification
FROM attachments a
JOIN purchase_orders po ON po.id=a.po_id
WHERE po.id=:po_id
  AND EXISTS (SELECT 1 FROM purchase_orders WHERE id=:po_id AND buyer_org_id=:org_id)
  AND :role IN ('buyer_admin','buyer_user')
  AND a.is_deleted=false AND po.is_deleted=false;
```

# Expected
good