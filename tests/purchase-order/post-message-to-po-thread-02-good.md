# Description
Compliant B test case for posting a message to a PO thread as a buyer. This implementation uses a JOIN with users table to verify organization membership, achieving the same security as version A with a different approach.

# Code
```sql
-- Compliant B (buyer): JOIN-based org verification
INSERT INTO messages (id, po_id, author_user_id, body, created_at)
SELECT :message_id, :po_id, :user_id, :body, :now
FROM purchase_orders po
INNER JOIN users u ON u.id = :user_id AND u.org_id = po.buyer_org_id
WHERE po.id = :po_id AND po.is_deleted = false
  AND u.role IN ('buyer_admin','buyer_user');
```

# Expected
good