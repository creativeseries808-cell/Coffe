-- ============================================
-- Luxury Coffee Shop Database Setup
-- ============================================

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('drive-thru', 'pick-up', 'dine-in')),
  arrival_time TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  order_status TEXT DEFAULT 'received' CHECK (order_status IN ('received', 'brewing', 'ready', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, image_url, category, available) VALUES
('Espresso', 'Rich and bold single shot', 250.00, 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400', 'Coffee', true),
('Cappuccino', 'Perfect balance of espresso, steamed milk and foam', 350.00, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400', 'Coffee', true),
('Latte', 'Smooth espresso with velvety steamed milk', 380.00, 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400', 'Coffee', true),
('Mocha', 'Decadent chocolate meets rich espresso', 420.00, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', 'Coffee', true),
('Croissant', 'Buttery, flaky French pastry', 200.00, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', 'Pastry', true),
('Blueberry Muffin', 'Fresh baked with juicy blueberries', 180.00, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400', 'Pastry', true);

-- Enable Row Level Security (RLS)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to menu_items"
  ON menu_items
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to orders"
  ON orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to orders"
  ON orders
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public update access to orders"
  ON orders
  FOR UPDATE
  USING (true);
