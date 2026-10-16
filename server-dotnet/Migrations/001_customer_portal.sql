CREATE TABLE IF NOT EXISTS crm_portal_accounts (
 account_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 entity_id BIGINT NOT NULL, customer_id BIGINT NOT NULL,
 email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
 password_hash VARCHAR(255) NOT NULL, is_active TINYINT NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_portal_email(email), UNIQUE KEY uq_portal_customer(entity_id,customer_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS crm_portal_sessions (
 token_hash CHAR(64) PRIMARY KEY, account_id BIGINT NOT NULL,
 expires_at DATETIME NOT NULL, INDEX(account_id),
 FOREIGN KEY(account_id) REFERENCES crm_portal_accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS crm_support_tickets (
 ticket_id BIGINT AUTO_INCREMENT PRIMARY KEY, entity_id BIGINT NOT NULL,
 customer_id BIGINT NOT NULL, subject VARCHAR(160) NOT NULL,
 priority VARCHAR(12) NOT NULL DEFAULT 'Normal', status VARCHAR(24) NOT NULL DEFAULT 'Open',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX(entity_id,customer_id), INDEX(entity_id,status)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS crm_support_messages (
 message_id BIGINT AUTO_INCREMENT PRIMARY KEY, ticket_id BIGINT NOT NULL,
 author_type VARCHAR(12) NOT NULL, body TEXT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(ticket_id) REFERENCES crm_support_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;
