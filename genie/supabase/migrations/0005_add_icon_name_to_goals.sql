-- Add icon_name column to goals table
ALTER TABLE goals ADD COLUMN icon_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN goals.icon_name IS 'Phosphor icon name selected by AI for the goal';
