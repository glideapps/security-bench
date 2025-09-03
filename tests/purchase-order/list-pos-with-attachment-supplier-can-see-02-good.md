# Description
Compliant B test case for listing POs with attachments as a buyer. This implementation enforces tenant boundaries through buyer_org_id validation and includes soft-delete filtering for both POs and attachments.

# Code
```sql
-- Compliant B (buyer): Tenant-scoped access with soft-delete filtering
SELECT DISTINCT po.id, po.status
FROM purchase_orders po
JOIN attachments a ON a.po_id=po.id
WHERE po.buyer_org_id=:org_id AND po.is_deleted=false AND a.is_deleted=false;
```

# Expected
good