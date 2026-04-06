-- 🛢️ Fuelify RLS & Data Refactor Migration --
-- IMPORTANT: Run this SQL directly in your Supabase SQL Editor to finish the Admin/Operator refactor.

-- 1. We no longer use the specialized `operators` table for access control,
-- nor do we restrict viewing transactions based on where someone was assigned.
-- Every authenticated user serves as an operator for any pump they log onto.

-- Drop old complex policies
DROP POLICY IF EXISTS "Operators see own pump records" ON fuel_transactions;
DROP POLICY IF EXISTS "Admins see all" ON fuel_transactions;

-- 2. Allow all authenticated users full CRUD over the fuel_transactions table.
CREATE POLICY "Authenticated users have full access to fuel_transactions" 
ON fuel_transactions 
FOR ALL USING (auth.role() = 'authenticated');

-- 3. pump_stations needs to be completely open for authenticated users as well 
-- since operators can now add new pumps right from their dashboard.
DROP POLICY IF EXISTS "Allow read access to all" ON pump_stations; -- Just in case you had this
DROP POLICY IF EXISTS "Authenticated users have full access to pump_stations" ON pump_stations;

CREATE POLICY "Authenticated users have full access to pump_stations" 
ON pump_stations 
FOR ALL USING (auth.role() = 'authenticated');

-- (Optional) If you have an `operators` table, you can leave it alone and it will act 
-- as extra metadata, but the application no longer hard-enforces it.
