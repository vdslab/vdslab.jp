-- 1. メンバータイプ用の列挙型定義
CREATE TYPE member_type AS ENUM ('Staff', 'Student', 'GraduateStudent', 'GraduateStudentDoctor');

-- 2. カテゴリーテーブル
CREATE TABLE categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- 3. メンバーテーブル
CREATE TABLE members (
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

-- 4. ニュース（記事）テーブル
CREATE TABLE posts (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    date DATE NOT NULL
);

-- 5. 研究成果（プロダクト）テーブル
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    publish_year INT NOT NULL,
    picture_url TEXT,
    picture_width INT,
    picture_height INT
);

-- 6. 研究プロジェクトテーブル
CREATE TABLE projects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_year INT NOT NULL,
    end_year INT, -- 継続中（end_year が NULL）に対応
    picture_url TEXT,
    picture_width INT,
    picture_height INT
);

-- 7. プロダクト <-> カテゴリーの中間テーブル (多対多)
CREATE TABLE product_categories (
    product_id VARCHAR(255) REFERENCES products(id) ON DELETE CASCADE,
    category_id VARCHAR(255) REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- 8. プロジェクト <-> カテゴリーの中間テーブル (多対多)
CREATE TABLE project_categories (
    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
    category_id VARCHAR(255) REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, category_id)
);

-- 9. クエリ高速化のためのインデックス
CREATE INDEX idx_members_type ON members(type);
CREATE INDEX idx_posts_date ON posts(date DESC);
CREATE INDEX idx_products_publish_year ON products(publish_year DESC);
CREATE INDEX idx_projects_start_year ON projects(start_year DESC);
