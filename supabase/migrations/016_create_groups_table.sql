-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN ('ministry', 'fellowship', 'age_group', 'special_interest', 'leadership')),
  meeting_day TEXT,
  meeting_time TIME,
  meeting_location TEXT,
  leader_id UUID REFERENCES app_users(id),
  co_leader_id UUID REFERENCES app_users(id),
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_leader ON groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update groups" ON groups
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete groups" ON groups
  FOR DELETE USING (true);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'co_leader', 'secretary', 'treasurer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, member_id)
);

-- Create indexes for group_memberships
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_member ON group_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_active ON group_memberships(is_active);

-- Enable RLS for group_memberships
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for group_memberships
CREATE POLICY "Users can view group memberships" ON group_memberships
  FOR SELECT USING (true);

CREATE POLICY "Users can create group memberships" ON group_memberships
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update group memberships" ON group_memberships
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete group memberships" ON group_memberships
  FOR DELETE USING (true);


