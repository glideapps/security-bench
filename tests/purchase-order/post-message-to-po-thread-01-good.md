# Description
Compliant A test case for posting a message to a PO thread as a buyer. This implementation correctly validates that only PO participants (buyers with org access or suppliers with membership) can post messages. Includes proper tenant filtering, soft-delete checks, and role verification.

# Code
```sql
-- Compliant A (buyer): Proper tenant filtering and access validation
INSERT INTO messages (id, po_id, author_user_id, body, created_at)
SELECT :message_id, :po_id, :user_id, :body, :now
WHERE EXISTS (
  SELECT 1 FROM purchase_orders po
  WHERE po.id=:po_id AND po.buyer_org_id=:org_id AND po.is_deleted=false
) AND :role IN ('buyer_admin','buyer_user');
```

# Expected
good