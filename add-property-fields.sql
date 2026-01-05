-- Add new property fields to the properties table

-- Surface details
ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_surface DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS living_room_surface DOUBLE PRECISION;

-- Rooms
ALTER TABLE properties ADD COLUMN IF NOT EXISTS toilets INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floors INTEGER;

-- Energy & construction
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_condition TEXT;

-- Property details
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_subtype TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS furnished BOOLEAN;

-- Features
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_garden BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garden_surface DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_terrace BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS terrace_surface DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_parking BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_spaces INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_swimming_pool BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_lift BOOLEAN;

-- Legal & availability
ALTER TABLE properties ADD COLUMN IF NOT EXISTS availability_date TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cadastral_income DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS planning_permission TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS flood_zone BOOLEAN;

-- Heating & utilities
ALTER TABLE properties ADD COLUMN IF NOT EXISTS heating_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS double_glazing BOOLEAN;

-- External links
ALTER TABLE properties ADD COLUMN IF NOT EXISTS virtual_tour TEXT;
