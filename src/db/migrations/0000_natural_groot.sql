CREATE TYPE "public"."auth_provider" AS ENUM('credentials', 'google', 'github');--> statement-breakpoint
CREATE TYPE "public"."budget_level" AS ENUM('minimal', 'average', 'premium');--> statement-breakpoint
CREATE TYPE "public"."expense_split" AS ENUM('equal', 'custom');--> statement-breakpoint
CREATE TYPE "public"."group_status" AS ENUM('forming', 'planning', 'active', 'completed', 'dissolved');--> statement-breakpoint
CREATE TYPE "public"."itinerary_item_type" AS ENUM('attraction', 'food', 'transport', 'rest', 'hidden_gem', 'medical_stop', 'accommodation');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('creator', 'member');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'system', 'location', 'emergency', 'image');--> statement-breakpoint
CREATE TYPE "public"."travel_style" AS ENUM('adventure', 'cultural', 'relaxation', 'culinary', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('draft', 'planning', 'confirmed', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "compatibility_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"overall_score" real NOT NULL,
	"personality_score" real,
	"budget_score" real,
	"food_score" real,
	"travel_style_score" real,
	"computed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"paid_by" uuid NOT NULL,
	"amount" real NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"description" varchar(300) NOT NULL,
	"category" varchar(50),
	"split_type" "expense_split" DEFAULT 'equal',
	"splits" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member',
	"medical_sharing_consent" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hidden_gems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" varchar(100),
	"name" varchar(200) NOT NULL,
	"category" varchar(100),
	"description" text,
	"story" text,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"city" varchar(100),
	"country" varchar(100),
	"gem_score" real NOT NULL,
	"authenticity_score" real,
	"tourist_density_score" real,
	"local_endorsements" integer DEFAULT 0,
	"photo_url" text,
	"best_time_to_visit" varchar(100),
	"tips" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "itinerary_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"date" timestamp NOT NULL,
	"theme" varchar(200),
	"weather_forecast" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"type" "itinerary_item_type" NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"location_name" varchar(200),
	"lat" real,
	"lng" real,
	"google_place_id" varchar(100),
	"estimated_duration_minutes" integer,
	"estimated_cost_per_person" real,
	"is_hidden_gem" boolean DEFAULT false,
	"gem_score" real,
	"opening_hours" text,
	"photo_url" text,
	"tips" text,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medical_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"blood_type" varchar(10),
	"conditions_encrypted" text,
	"medications_encrypted" text,
	"allergies_encrypted" text,
	"emergency_contacts_encrypted" text,
	"first_aid_notes_encrypted" text,
	"condition_categories" text[],
	"share_with_group" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"sender_id" uuid,
	"content" text NOT NULL,
	"type" "message_type" DEFAULT 'text',
	"sentiment_score" real,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personality_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"openness" real NOT NULL,
	"conscientiousness" real NOT NULL,
	"extraversion" real NOT NULL,
	"agreeableness" real NOT NULL,
	"neuroticism" real NOT NULL,
	"travel_style" "travel_style" NOT NULL,
	"risk_tolerance" integer NOT NULL,
	"budget_level" "budget_level" NOT NULL,
	"preferred_group_size" integer DEFAULT 4,
	"languages_spoken" text[],
	"food_preferences" jsonb,
	"interests" text[],
	"embedding_vector" real[],
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_match_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"is_anonymous" boolean DEFAULT true,
	"status" varchar(20) DEFAULT 'active',
	"overall_sentiment" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_match_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sentiment_score" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"cuisine_types" text[],
	"price_level" integer,
	"rating" real,
	"total_ratings" integer,
	"lat" real,
	"lng" real,
	"address" text,
	"city" varchar(100),
	"country" varchar(100),
	"specialties" text[],
	"is_local_gem" boolean DEFAULT false,
	"gem_score" real,
	"photo_url" text,
	"opening_hours" jsonb,
	"last_fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" "group_status" DEFAULT 'forming',
	"max_members" integer DEFAULT 4,
	"destination" varchar(200),
	"trip_start_date" timestamp,
	"trip_end_date" timestamp,
	"created_by" uuid NOT NULL,
	"compatibility_score" real,
	"invite_code" varchar(12),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"destination" varchar(200) NOT NULL,
	"destination_lat" real,
	"destination_lng" real,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"duration_days" integer NOT NULL,
	"status" "trip_status" DEFAULT 'draft',
	"total_budget" real,
	"per_person_budget" real,
	"currency" varchar(3) DEFAULT 'USD',
	"hidden_gem_mode" boolean DEFAULT false,
	"generation_prompt_used" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"name" varchar(100) NOT NULL,
	"avatar_url" text,
	"age" integer,
	"gender" varchar(20),
	"nationality" varchar(100),
	"auth_provider" "auth_provider" DEFAULT 'credentials',
	"is_verified" boolean DEFAULT false,
	"is_onboarded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "compatibility_scores" ADD CONSTRAINT "compatibility_scores_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_scores" ADD CONSTRAINT "compatibility_scores_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_travel_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."travel_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_day_id_itinerary_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD CONSTRAINT "medical_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_group_id_travel_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."travel_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_profiles" ADD CONSTRAINT "personality_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_match_chats" ADD CONSTRAINT "pre_match_chats_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_match_chats" ADD CONSTRAINT "pre_match_chats_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_match_messages" ADD CONSTRAINT "pre_match_messages_chat_id_pre_match_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."pre_match_chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_match_messages" ADD CONSTRAINT "pre_match_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_groups" ADD CONSTRAINT "travel_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_group_id_travel_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."travel_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compat_pair_idx" ON "compatibility_scores" USING btree ("user_a_id","user_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_group_member" ON "group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "hidden_gems_city_idx" ON "hidden_gems" USING btree ("city");--> statement-breakpoint
CREATE INDEX "hidden_gems_score_idx" ON "hidden_gems" USING btree ("gem_score");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_trip_day_idx" ON "itinerary_days" USING btree ("trip_id","day_number");--> statement-breakpoint
CREATE UNIQUE INDEX "medical_user_idx" ON "medical_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_group_idx" ON "messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "personality_user_idx" ON "personality_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_place_id_idx" ON "restaurants" USING btree ("google_place_id");--> statement-breakpoint
CREATE INDEX "restaurants_city_idx" ON "restaurants" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "group_invite_code_idx" ON "travel_groups" USING btree ("invite_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");