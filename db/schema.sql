-- vdslab.jp Database Schema

-- Custom enum for member types
DO $$ BEGIN
  CREATE TYPE member_type AS ENUM (
    'Staff',
    'Student',
    'GraduateStudent',
    'GraduateStudentDoctor'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  picture_url TEXT,
  picture_width INT,
  picture_height INT,
  type member_type NOT NULL,
  "order" INT DEFAULT 0,
  assigned_year INT
);

-- Posts (News) table
CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  date DATE NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  publish_year INT NOT NULL,
  picture_url TEXT,
  picture_width INT,
  picture_height INT
);

-- Product Categories link table
CREATE TABLE IF NOT EXISTS product_categories (
  product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id VARCHAR(255) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_year INT NOT NULL,
  end_year INT,
  picture_url TEXT,
  picture_width INT,
  picture_height INT
);

-- Project Categories link table
CREATE TABLE IF NOT EXISTS project_categories (
  project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id VARCHAR(255) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);

-- Images table (for self-hosted images)
CREATE TABLE IF NOT EXISTS images (
  id VARCHAR(255) PRIMARY KEY,
  data BYTEA NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  width INT NOT NULL CHECK (width > 0),
  height INT NOT NULL CHECK (height > 0),
  filename VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Secondary performance indexes
CREATE INDEX IF NOT EXISTS idx_members_type ON members(type);
CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_products_publish_year ON products(publish_year DESC);
CREATE INDEX IF NOT EXISTS idx_projects_start_year ON projects(start_year DESC);
