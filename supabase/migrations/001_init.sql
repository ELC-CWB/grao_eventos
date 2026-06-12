-- ================================================
-- GRÃO EVENTOS - Database Schema
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- PROFILES
-- ================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- EVENTS
-- ================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  color TEXT DEFAULT '#f37022',
  location TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- EVENT USERS (managers assigned to events)
-- ================================================
CREATE TABLE event_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ================================================
-- CATEGORIES (per event)
-- ================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- RESPONSIBLE PERSONS (per event)
-- ================================================
CREATE TABLE responsible_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- TRANSACTIONS
-- ================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  responsible_person_id UUID REFERENCES responsible_persons(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- SUPPLIERS (global)
-- ================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  category TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsible_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if user has access to event
CREATE OR REPLACE FUNCTION user_has_event_access(p_user_id UUID, p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin'
    UNION ALL
    SELECT 1 FROM event_users WHERE user_id = p_user_id AND event_id = p_event_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (
  get_user_role(auth.uid()) = 'admin' AND id != auth.uid()
);

-- EVENTS policies
CREATE POLICY "Admins see all events" ON events FOR SELECT USING (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Managers see their events" ON events FOR SELECT USING (
  get_user_role(auth.uid()) = 'manager' AND
  EXISTS (SELECT 1 FROM event_users WHERE user_id = auth.uid() AND event_id = id)
);
CREATE POLICY "Admins can insert events" ON events FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update events" ON events FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Admins can delete events" ON events FOR DELETE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- EVENT_USERS policies
CREATE POLICY "Users can view event_users" ON event_users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage event_users" ON event_users FOR ALL USING (
  get_user_role(auth.uid()) = 'admin'
);

-- CATEGORIES policies
CREATE POLICY "Users with event access can view categories" ON categories FOR SELECT USING (
  user_has_event_access(auth.uid(), event_id)
);
CREATE POLICY "Users with event access can insert categories" ON categories FOR INSERT WITH CHECK (
  user_has_event_access(auth.uid(), event_id)
);
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Users with event access can delete categories" ON categories FOR DELETE USING (
  user_has_event_access(auth.uid(), event_id)
);

-- RESPONSIBLE_PERSONS policies
CREATE POLICY "Users with event access can view persons" ON responsible_persons FOR SELECT USING (
  user_has_event_access(auth.uid(), event_id)
);
CREATE POLICY "Users with event access can insert persons" ON responsible_persons FOR INSERT WITH CHECK (
  user_has_event_access(auth.uid(), event_id)
);
CREATE POLICY "Users with event access can delete persons" ON responsible_persons FOR DELETE USING (
  user_has_event_access(auth.uid(), event_id)
);

-- TRANSACTIONS policies
CREATE POLICY "Users with event access can view transactions" ON transactions FOR SELECT USING (
  user_has_event_access(auth.uid(), event_id)
);
CREATE POLICY "Users with event access can insert transactions" ON transactions FOR INSERT WITH CHECK (
  user_has_event_access(auth.uid(), event_id)
);
CREATE POLICY "Admins can update any transaction" ON transactions FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Managers can update own transactions" ON transactions FOR UPDATE USING (
  get_user_role(auth.uid()) = 'manager' AND created_by = auth.uid()
);
CREATE POLICY "Admins can delete any transaction" ON transactions FOR DELETE USING (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Managers can delete own transactions" ON transactions FOR DELETE USING (
  get_user_role(auth.uid()) = 'manager' AND created_by = auth.uid()
);

-- SUPPLIERS policies
CREATE POLICY "Authenticated users can view suppliers" ON suppliers FOR SELECT USING (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Authenticated users can insert suppliers" ON suppliers FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins can update suppliers" ON suppliers FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);
CREATE POLICY "Users can update own suppliers" ON suppliers FOR UPDATE USING (
  created_by = auth.uid()
);
CREATE POLICY "Admins can delete suppliers" ON suppliers FOR DELETE USING (
  get_user_role(auth.uid()) = 'admin'
);

-- ================================================
-- INDEXES for performance
-- ================================================
CREATE INDEX idx_transactions_event_id ON transactions(event_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_event_users_user_id ON event_users(user_id);
CREATE INDEX idx_event_users_event_id ON event_users(event_id);
CREATE INDEX idx_categories_event_id ON categories(event_id);
CREATE INDEX idx_responsible_persons_event_id ON responsible_persons(event_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_suppliers_name ON suppliers(name);
