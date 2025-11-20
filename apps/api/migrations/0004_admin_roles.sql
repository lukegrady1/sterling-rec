-- Add admin role support to users table

-- Add role column to users
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Create index on role
CREATE INDEX idx_users_role ON users(role);

-- Add constraint to ensure valid roles
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- Update comment
COMMENT ON COLUMN users.role IS 'User role: user or admin';
