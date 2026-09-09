-- Run before deploying the broadcast backend. Does not send mail or modify existing data.
CREATE TABLE IF NOT EXISTS broadcasts (
    id BINARY(16) NOT NULL PRIMARY KEY,
    subject VARCHAR(200) NOT NULL,
    body MEDIUMTEXT NOT NULL,
    audience VARCHAR(24) NOT NULL,
    term_code VARCHAR(4),
    status VARCHAR(16) NOT NULL,
    created_by BINARY(16) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX idx_broadcast_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS broadcast_deliveries (
    id BINARY(16) NOT NULL PRIMARY KEY,
    broadcast_id BINARY(16) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL,
    attempts INT NOT NULL,
    attempted_at DATETIME(6),
    sent_at DATETIME(6),
    last_error VARCHAR(500),
    CONSTRAINT fk_broadcast_delivery FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id),
    CONSTRAINT uq_broadcast_email UNIQUE (broadcast_id, email),
    INDEX idx_broadcast_delivery_status (broadcast_id, status)
) ENGINE=InnoDB;
