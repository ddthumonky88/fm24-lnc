CREATE TABLE IF NOT EXISTS nations (
  id VARCHAR(64) PRIMARY KEY,
  name_lg VARCHAR(255) NOT NULL,
  name_sh VARCHAR(255) NOT NULL,
  name_3l VARCHAR(50) NOT NULL,
  confed VARCHAR(32),
  inactive_fields TEXT
);

CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64),
  nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE CASCADE,
  UNIQUE(nation_id, name)
);

CREATE TABLE IF NOT EXISTS cities (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE SET NULL,
  region VARCHAR(255),
  region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
  is_disabled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS competitions (
  id VARCHAR(64) PRIMARY KEY,
  name_lg VARCHAR(255) NOT NULL,
  name_sh VARCHAR(255) NOT NULL,
  name_3l VARCHAR(50),
  fg_color VARCHAR(100),
  bg_color VARCHAR(100),
  confed VARCHAR(32),
  nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE SET NULL,
  type VARCHAR(255),
  parent_id VARCHAR(64),
  note TEXT,
  inactive_fields TEXT
);

CREATE TABLE IF NOT EXISTS clubs (
  id VARCHAR(64) PRIMARY KEY,
  name_lg VARCHAR(255) NOT NULL,
  name_sh VARCHAR(255) NOT NULL,
  name_6l VARCHAR(50),
  name_3l VARCHAR(50),
  nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE SET NULL,
  comp_id VARCHAR(64) REFERENCES competitions(id) ON DELETE SET NULL,
  affiliate_club_id VARCHAR(64),
  affiliate_club_type VARCHAR(64),
  note TEXT,
  inactive_fields TEXT,
  is_extinct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS stadiums (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE SET NULL,
  is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  type VARCHAR(50) NOT NULL DEFAULT 'stadium'
);

CREATE TABLE IF NOT EXISTS awards (
  id VARCHAR(64) PRIMARY KEY,
  name_lg VARCHAR(255) NOT NULL,
  name_sh VARCHAR(255) NOT NULL,
  nation_id VARCHAR(64) REFERENCES nations(id) ON DELETE SET NULL,
  comp_id VARCHAR(64) REFERENCES competitions(id) ON DELETE SET NULL,
  inactive_fields TEXT
);

CREATE TABLE IF NOT EXISTS people (
  id VARCHAR(64) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  common_name VARCHAR(255) NOT NULL DEFAULT '',
  second_name VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nations_confed ON nations(confed);
CREATE INDEX IF NOT EXISTS idx_competitions_nation ON competitions(nation_id);
CREATE INDEX IF NOT EXISTS idx_clubs_nation ON clubs(nation_id);
CREATE INDEX IF NOT EXISTS idx_clubs_comp ON clubs(comp_id);
