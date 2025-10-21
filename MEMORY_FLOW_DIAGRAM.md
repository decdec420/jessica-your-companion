# Memory Persistence Implementation Flow

## Overview
This document illustrates the flow of how Jessica remembers and uses information across conversations.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User Action: Start New Conversation                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Chat.tsx: initializeConversation() or handleNewConversation()  │
│ - Creates new conversation in database                          │
│ - Checks if conversation has messages                           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Has Messages? │
         └───────┬───────┘
                 │
        No       │       Yes
    ┌────────────┼────────────┐
    │                         │
    ▼                         ▼
┌───────────────────┐    ┌──────────────┐
│sendInitialGreeting│    │ Load and     │
│(convId)           │    │ Display      │
└────────┬──────────┘    │ Messages     │
         │               └──────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Edge Function Call: chat/index.ts                              │
│ Message: "__INITIAL_GREETING__"                                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Detect special greeting message (isInitialGreeting = true)  │
│ 2. Load user memories from database                            │
│    - identity: name, pronouns, etc.                             │
│    - preferences, goals, challenges, interests                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Build Context                                                   │
│ - System Prompt with personality traits                         │
│ - Memory Context: "What I remember about you: ..."             │
│ - No conversation history (fresh start)                         │
│ - Transform message to: "Greet me warmly... use my name..."    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Call Lovable AI                                                 │
│ - Model: gemini-2.5-flash                                       │
│ - With memories in context                                      │
│ - Generate personalized greeting                                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI Response                                                     │
│ Example: "Hey Alex! 👋 How's it going?"                        │
│ (Uses name from identity memory if available)                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Chat.tsx: Receive Response                                     │
│ 1. Display greeting in chat UI                                 │
│ 2. Save greeting as assistant message in database               │
│ 3. Set loading = false                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Memory Flow Across Conversations

```
Conversation 1                    Conversation 2 (New)
─────────────                    ────────────────────

User: "Hi, my name is Alex"      [Auto-Generated]
                                  Jessica: "Hey Alex! 👋"
Jessica: "Nice to meet you        (Uses stored memory)
Alex! I'll remember that."
                                  User: [Can continue chatting]
[Saves to memories table]         
- category: identity              [Memories loaded from DB]
- memory_text: "User's name       - "User's name is Alex"
  is Alex"                        
- importance: 9

User: [Continues chatting]

```

## Key Components

### 1. Memory Storage
- **Table**: `memories`
- **Fields**: user_id, category, memory_text, importance
- **Triggered by**: AI's `save_memory` tool function

### 2. Greeting Logic
- **Location**: `Chat.tsx`
- **Function**: `sendInitialGreeting(convId)`
- **Trigger**: New conversation with no messages

### 3. Edge Function
- **Location**: `supabase/functions/chat/index.ts`
- **Special Message**: `__INITIAL_GREETING__`
- **Behavior**: Loads memories, generates personalized greeting

## Benefits

1. **Continuity**: Users feel remembered across sessions
2. **Personalization**: Greetings use stored information
3. **ADHD-Friendly**: Immediate engagement without waiting
4. **Learning**: Jessica continuously builds knowledge about the user
5. **Natural Conversation**: No need to re-introduce yourself

## Memory Categories

| Category    | Examples                           | Importance |
|-------------|------------------------------------|------------|
| identity    | Name, pronouns, age, location      | 9-10       |
| preferences | Favorite things, communication style| 5-8       |
| goals       | Career goals, personal objectives  | 6-9        |
| challenges  | ADHD symptoms, struggles           | 7-10       |
| interests   | Hobbies, topics of interest        | 4-7        |
