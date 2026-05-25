-- ============================================================================
-- TrafficPro Database Schema
-- Designed for Supabase / PostgreSQL
-- ============================================================================

-- Enable UUID extension for auto-generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Table: shops (Mechanics & Spare Parts Suppliers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT, -- 'Mechanic' or 'Supplier'
    image TEXT, -- URL to shop image
    rating NUMERIC(3, 2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
    reviews INTEGER DEFAULT 0 CHECK (reviews >= 0),
    phone TEXT,
    x NUMERIC, -- Coordinate x (pixel or relative coordinate)
    y NUMERIC, -- Coordinate y (pixel or relative coordinate)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for sorting shops by rating (which is done in db.ts)
CREATE INDEX IF NOT EXISTS idx_shops_rating ON shops(rating DESC);

-- ============================================================================
-- 2. Table: pois (Points of Interest: Fuel Hubs & Hotels)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('fuel', 'hotel')),
    name TEXT NOT NULL,
    brand TEXT, -- e.g., 'Shell', 'Total'
    rating NUMERIC(3, 2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
    price TEXT, -- Price indicator or range
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. Table: fuel_reports (Crowdsourced Fuel Status Updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fuel_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
    fuel_status TEXT NOT NULL, -- e.g., 'Available', 'Out of stock', 'Long queues'
    reported_by TEXT NOT NULL, -- User/Reporter ID
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ordering fuel reports chronologically per POI
CREATE INDEX IF NOT EXISTS idx_fuel_reports_poi_created ON fuel_reports(poi_id, created_at DESC);

-- ============================================================================
-- 4. Table: spare_parts (Spare Parts Catalogue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price TEXT, -- Price string, e.g., '$85.00'
    rating NUMERIC(3, 2) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
    image TEXT,
    compatibility TEXT, -- e.g., 'Universal', 'Toyota Corolla'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for sorting spare parts alphabetically
CREATE INDEX IF NOT EXISTS idx_spare_parts_name ON spare_parts(name ASC);

-- ============================================================================
-- 5. Table: hazards (Road Hazards Reported by Drivers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- e.g., 'pothole', 'debris', 'speed_bump', 'accident'
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    title TEXT,
    note TEXT,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    x NUMERIC,
    y NUMERIC,
    reporter_id TEXT, -- User ID of reporter
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fetching active hazards quickly (used in fetchActiveHazards)
CREATE INDEX IF NOT EXISTS idx_hazards_active_created ON hazards(active, created_at DESC);

-- ============================================================================
-- 6. Table: parked_vehicles (Parked Vehicle Pins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parked_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    x NUMERIC,
    y NUMERIC,
    active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMPTZ DEFAULT now()
);

-- Index for active parked vehicle lookups per user
CREATE INDEX IF NOT EXISTS idx_parked_vehicles_user_active ON parked_vehicles(user_id, active);

-- ============================================================================
-- 7. Table: mechanic_ratings (User Reviews for Mechanic Shops)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mechanic_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mechanic_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for sorting ratings chronologically
CREATE INDEX IF NOT EXISTS idx_mechanic_ratings_created ON mechanic_ratings(created_at DESC);

-- ============================================================================
-- 8. Table: chat_messages (Live Provider Chat support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for loading chat messages in correct chronological order
CREATE INDEX IF NOT EXISTS idx_chat_messages_provider_created ON chat_messages(provider_id, created_at ASC);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Supabase enforces RLS by default. These policies permit anonymous client
-- access matching the application design (no strict auth required).
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE parked_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanic_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 1. Shops Policies
CREATE POLICY "Allow public read access on shops" ON shops FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on shops" ON shops FOR INSERT WITH CHECK (true);

-- 2. POIs Policies
CREATE POLICY "Allow public read access on pois" ON pois FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on pois" ON pois FOR INSERT WITH CHECK (true);

-- 3. Fuel Reports Policies
CREATE POLICY "Allow public read access on fuel_reports" ON fuel_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on fuel_reports" ON fuel_reports FOR INSERT WITH CHECK (true);

-- 4. Spare Parts Policies
CREATE POLICY "Allow public read access on spare_parts" ON spare_parts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on spare_parts" ON spare_parts FOR INSERT WITH CHECK (true);

-- 5. Hazards Policies
CREATE POLICY "Allow public read access on hazards" ON hazards FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on hazards" ON hazards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on hazards" ON hazards FOR UPDATE USING (true);

-- 6. Parked Vehicles Policies
CREATE POLICY "Allow public read access on parked_vehicles" ON parked_vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on parked_vehicles" ON parked_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on parked_vehicles" ON parked_vehicles FOR UPDATE USING (true);

-- 7. Mechanic Ratings Policies
CREATE POLICY "Allow public read access on mechanic_ratings" ON mechanic_ratings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on mechanic_ratings" ON mechanic_ratings FOR INSERT WITH CHECK (true);

-- 8. Chat Messages Policies
CREATE POLICY "Allow public read access on chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);


-- ============================================================================
-- OPTIONAL: SEED DATA INSERTION
-- Copy and run this section if you want to populate your database immediately
-- with initial shops, POIs, hazards, and parts.
-- ============================================================================

/*
-- Seed Shops (Mechanics & Suppliers)
INSERT INTO shops (name, type, rating, reviews, phone, x, y) VALUES
('QuickFix Auto Care', 'Mechanic', 4.8, 156, '+263 77 111 2222', 35, 68),
('Global Parts Hub', 'Supplier', 4.7, 89, '+263 77 333 4444', 15, 80),
('Precision Brakes', 'Mechanic', 4.9, 42, '+263 77 555 6666', 70, 25);

-- Seed POIs (Fuel Stations & Lodges)
INSERT INTO pois (kind, name, brand, rating, x, y) VALUES
('fuel', 'Shell Samora', 'Shell', 4.5, 22, 78),
('fuel', 'TotalEnergies Avondale', 'Total', 4.3, 45, 55),
('hotel', 'Roadside Lodge', NULL, 4.2, 54, 44);

-- Seed Hazards
INSERT INTO hazards (type, severity, title, note, x, y, lat, lng, active) VALUES
('pothole', 'high', 'Huge pothole after the bridge', 'Stay in the left lane', 30, 72, -17.8248, 31.0530, true),
('debris', 'medium', 'Tire debris on road', 'Scattered across two lanes', 46, 54, -17.8300, 31.0600, true),
('speed_bump', 'low', 'New unmarked bump', NULL, 62, 36, -17.8400, 31.0700, true);

-- Seed Spare Parts
INSERT INTO spare_parts (name, category, price, rating, compatibility) VALUES
('Brake Pads - Premium', 'Brakes', '$85.00', 4.8, 'Universal'),
('Castrol Edge 5W-30', 'Engines', '$45.00', 4.9, 'All Gasoline'),
('Michelin Pilot Sport 4', 'Tires', '$180.00', 5.0, 'Sedans');
*/
