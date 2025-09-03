# Description
This is a compliant query (Compliant B) for suppliers to list attachments for a PO. It properly enforces membership-based access control by checking supplier_users table, includes soft-delete filtering on both entities, and appropriately restricts suppliers to only see attachments with 'public' or 'supplier_visible' classifications.

# Code
```sql
-- Compliant B (supplier): only public/supplier_visible; membership
SELECT a.id, a.filename, a.classification
FROM attachments a
JOIN purchase_orders po ON po.id=a.po_id
WHERE po.id=:po_id
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND a.classification IN ('public','supplier_visible')
  AND a.is_deleted=false AND po.is_deleted=false;
```

# Expected
good