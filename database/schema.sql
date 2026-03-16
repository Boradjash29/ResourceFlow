CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('meeting_room', 'projector', 'laptop', 'conference_hall', 'other')),
  capacity INT DEFAULT 0,
  location VARCHAR(200),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  meeting_title VARCHAR(100) NOT NULL,
  description TEXT,
  participants JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_conflict ON bookings(resource_id, start_time, end_time) WHERE status != 'cancelled';

-- Embeddings table
DROP TABLE IF EXISTS embeddings CASCADE;
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding_vector vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING hnsw (embedding_vector vector_cosine_ops);

-- Booking overlap prevention
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlap;
ALTER TABLE bookings ADD CONSTRAINT no_overlap 
EXCLUDE USING gist (resource_id WITH =, tsrange(start_time, end_time) WITH &&)
WHERE (status != 'cancelled');

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('booking_confirmed', 'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled', 'reminder', 'announcement')),
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject', 'override', 'login', 'logout')),
  entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('user', 'resource', 'booking', 'setting')),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
