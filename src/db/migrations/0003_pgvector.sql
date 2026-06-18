CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "personality_profiles" DROP COLUMN IF EXISTS "embedding_vector";
ALTER TABLE "personality_profiles" ADD COLUMN "embedding_vector" vector(5);