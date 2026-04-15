-- Run this in your Supabase SQL Editor to set up the database

-- Users (both hosts and renters)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('host', 'renter', 'admin')) DEFAULT 'renter',
  company_name TEXT,
  gstin TEXT,
  kyc_status TEXT DEFAULT 'pending',
  wallet_balance_inr NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- GPU Machines registered by hosts
CREATE TABLE machines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES users(id),
  gpu_model TEXT NOT NULL,
  gpu_count INTEGER DEFAULT 1,
  vram_gb INTEGER NOT NULL,
  cpu_cores INTEGER NOT NULL,
  ram_gb INTEGER NOT NULL,
  storage_gb INTEGER NOT NULL,
  os TEXT DEFAULT 'ubuntu-22.04',
  location_city TEXT,
  status TEXT CHECK (status IN ('available', 'rented', 'offline')) DEFAULT 'offline',
  hourly_rate_inr NUMERIC NOT NULL,
  tailscale_ip TEXT,
  reliability_score NUMERIC DEFAULT 100.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Rental sessions
CREATE TABLE rentals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  renter_id UUID REFERENCES users(id),
  machine_id UUID REFERENCES machines(id),
  template_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('starting', 'running', 'paused', 'terminated')) DEFAULT 'starting',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_cost_inr NUMERIC DEFAULT 0,
  host_payout_inr NUMERIC DEFAULT 0,
  platform_fee_inr NUMERIC DEFAULT 0
);

-- Payments & invoicing
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  rental_id UUID REFERENCES rentals(id) NULL,
  amount_inr NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'rental_charge', 'host_payout')),
  razorpay_payment_id TEXT,
  gst_amount NUMERIC DEFAULT 0,
  invoice_url TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view available machines" ON machines FOR SELECT USING (status = 'available');
CREATE POLICY "Hosts can view and manage their own machines" ON machines FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Users can view their own rentals" ON rentals FOR SELECT USING (auth.uid() = renter_id OR auth.uid() IN (SELECT host_id FROM machines WHERE id = machine_id));
CREATE POLICY "Renters can create rentals" ON rentals FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
