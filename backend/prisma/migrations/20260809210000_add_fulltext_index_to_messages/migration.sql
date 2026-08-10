-- Add fulltext search index for messages table
CREATE INDEX message_content_search_idx ON "messages" USING GIN (to_tsvector('spanish', content));
