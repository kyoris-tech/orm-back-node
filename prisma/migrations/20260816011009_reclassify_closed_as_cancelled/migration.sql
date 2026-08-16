-- Data migration: the previous "cancel" action set status to CLOSED. Now
-- CLOSED and CANCELLED are distinct terminal states, so reclassify any
-- pre-existing CLOSED rows (which all originated from the old cancel
-- action) as CANCELLED to preserve their original meaning.
UPDATE "SelectionProcess"
SET status = 'CANCELLED', "cancelledAt" = "updatedAt"
WHERE status = 'CLOSED';
