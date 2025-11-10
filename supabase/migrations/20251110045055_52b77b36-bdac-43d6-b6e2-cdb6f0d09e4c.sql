-- Add last_message_at to track conversation recency
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing conversations to have their last message time
UPDATE conversations c
SET last_message_at = (
  SELECT MAX(created_at) 
  FROM messages m 
  WHERE m.conversation_id = c.id
)
WHERE EXISTS (
  SELECT 1 FROM messages m WHERE m.conversation_id = c.id
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
ON conversations(user_id, last_message_at DESC);

-- Add trigger to auto-update last_message_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_conversation_last_message ON messages;
CREATE TRIGGER update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();