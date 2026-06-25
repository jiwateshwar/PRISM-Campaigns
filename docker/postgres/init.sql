-- PostgreSQL initialization for PRISM Campaigns
-- Enables UUID generation extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
