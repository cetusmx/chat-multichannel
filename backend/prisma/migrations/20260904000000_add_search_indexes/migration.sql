-- Create GIN index for full-text search on Messages
CREATE INDEX IF NOT EXISTS "idx_messages_content_tsvector" 
ON "messages" USING GIN (to_tsvector('spanish', COALESCE(content, '')));

-- Create extension pg_trgm if not exists for ILIKE optimization (optional but good for clients)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for clients name and phone_number using trigram
CREATE INDEX IF NOT EXISTS "idx_clients_name_trgm" 
ON "clients" USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_clients_phone_trgm" 
ON "clients" USING GIN (phone_number gin_trgm_ops);
