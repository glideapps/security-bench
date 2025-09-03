# Description
Compliant B test case for posting a message to a PO thread as a supplier. This implementation correctly validates supplier membership through the supplier_users table and ensures only participants can post to PO threads. Includes proper soft-delete checks for PO validity.

# Code
```sql
-- Compliant B (supplier): Membership validation via supplier_users
INSERT INTO messages (po_id, author_user_id, body, created_at)
SELECT :po_id, :user_id, :body, :now
WHERE EXISTS (
  SELECT 1 FROM purchase_orders po
  WHERE po.id=:po_id AND po.is_deleted=false
    AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
) AND :role='supplier_user';
```

# Expected
good