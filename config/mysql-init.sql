-- MySQL Database Initialization Script
-- Art Gallery Cross-Post System

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS artwork_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Use the database
USE artwork_tracker;

-- Create the posted_artwork table (equivalent to SQLite schema)
CREATE TABLE IF NOT EXISTS posted_artwork (
  id VARCHAR(255) PRIMARY KEY,
  deviantart_id VARCHAR(255) UNIQUE NOT NULL,
  deviantart_url TEXT,
  tumblr_post_id VARCHAR(255),
  artist_username VARCHAR(255),
  title TEXT,
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_artist_username (artist_username),
  INDEX idx_posted_at (posted_at)
);

-- Create a user for the application (will be overridden by environment variables)
-- This is just a fallback, actual user creation happens via environment variables