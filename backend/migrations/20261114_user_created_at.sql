-- Adds users.created_at (registration time, UTC). Run before deploying the build whose User entity has
-- createdAt: ddl-auto=update would add the column as NOT NULL without a value for existing rows.
-- Safe while the old build is running: each step keeps the column valid for the old insert path.

-- 1. Expand: nullable, so existing rows and the old build's inserts are accepted.
ALTER TABLE users ADD COLUMN created_at DATETIME(6) NULL;
-- 2. Users registered by the old build from now on get their insert time.
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT (UTC_TIMESTAMP(6));

-- 3. Backfill: the first real (non-test) welcome email marks the registration.
UPDATE users u
JOIN (
    SELECT recipient_email, MIN(sent_at) AS sent_at
    FROM alert_delivery_logs
    WHERE alert_type = 'WELCOME' AND manual_test = FALSE
    GROUP BY recipient_email
) w ON w.recipient_email = u.email
SET u.created_at = w.sent_at
WHERE u.created_at IS NULL;

-- 4. Users whose welcome email was never logged get the earliest welcome time on record.
UPDATE users
SET created_at = COALESCE(
    (SELECT MIN(sent_at) FROM alert_delivery_logs WHERE alert_type = 'WELCOME' AND manual_test = FALSE),
    UTC_TIMESTAMP(6))
WHERE created_at IS NULL;

-- 5. Contract: every row now has a value.
ALTER TABLE users MODIFY COLUMN created_at DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6));

-- Check: users that fell back to step 4.
-- SELECT email, created_at FROM users u WHERE NOT EXISTS (SELECT 1 FROM alert_delivery_logs l
--     WHERE l.alert_type = 'WELCOME' AND l.manual_test = FALSE AND l.recipient_email = u.email);
