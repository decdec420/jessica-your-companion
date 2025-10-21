# Testing Memory Persistence Across Conversations

This document describes how to manually verify that Jessica remembers information (like your name) across different conversations.

## Test Scenario

**Objective**: Verify that Jessica remembers the user's name across new conversations.

## Steps to Test

### 1. First Conversation - Introduce Yourself
1. Start the application (`npm run dev`)
2. Log in or create an account
3. In the first conversation, tell Jessica your name
   - Example: "Hi Jessica, my name is Alex"
4. Jessica should acknowledge and save this to memory
5. Check the Memories page to verify your name was saved in the "identity" category

### 2. Create a New Conversation
1. Click "New Chat" button in the sidebar
2. **Expected Behavior**: Jessica should greet you automatically and use your name
   - Example: "Hey Alex! 👋 How's it going?"
3. The greeting should appear immediately without you sending a message first

### 3. Return After Closing Browser
1. Close the browser completely
2. Reopen the application and log in
3. Start a new conversation
4. **Expected Behavior**: Jessica should still remember and use your name in the greeting

## What Changed

### Before Fix
- When starting a new conversation, the EmptyState component showed a generic "Hi, I'm Jessica" message
- Jessica didn't proactively greet users
- Even though memories were loaded, they weren't used until the user sent the first message

### After Fix
- When starting a new conversation, Jessica automatically sends a personalized greeting
- The greeting uses information from stored memories (like your name)
- This happens immediately when the conversation loads
- The greeting is saved as a message in the conversation history

## Technical Details

### Key Components Modified

1. **Chat.tsx**:
   - `sendInitialGreeting()`: Sends a special `__INITIAL_GREETING__` message to the edge function
   - `initializeConversation()`: Checks if a new conversation is empty and triggers the greeting
   - `handleNewConversation()`: Triggers greeting when user manually creates a new chat

2. **chat/index.ts** (Edge Function):
   - Detects `__INITIAL_GREETING__` special message
   - Loads user memories before generating the greeting
   - Transforms the greeting request into a prompt that encourages using stored information
   - System prompt updated to emphasize using names in greetings

### Memory Categories
- `identity`: Personal information like name, pronouns, etc.
- `preferences`: User preferences
- `goals`: User's goals and aspirations
- `challenges`: Challenges the user faces
- `interests`: User's interests and hobbies

Memories are automatically saved when Jessica learns important information through the `save_memory` tool function.
