# Description
❌3 Bad test case that ignores soft-delete flags. This violates data integrity by including deleted POs and attachments in results, potentially exposing archived or invalid attachment information.

# Code
```sql
-- ❌3 (soft-delete ignored): Includes deleted items
-- SAFE: excludes deleted items
SELECT DISTINCT po.id FROM purchase_orders po
JOIN attachments a ON a.po_id=po.id
WHERE po.buyer_org_id=:org_id;
```

# Expected
bad