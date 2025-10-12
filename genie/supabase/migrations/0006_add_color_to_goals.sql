-- Add color column to goals table
ALTER TABLE goals ADD COLUMN color TEXT;

-- Add comment for documentation
COMMENT ON COLUMN goals.color IS 'AI-selected color for the goal (yellow, green, red, blue, orange, purple, pink, cyan, lime, magenta)';
