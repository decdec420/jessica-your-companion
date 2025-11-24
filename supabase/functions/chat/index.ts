import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, lastMessageAt } = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Get conversation history
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Get user's memories with intelligent prioritization
    // Combine importance (40%), recency (30%), and relevance to active projects (30%)
    const { data: allMemories } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    // Score and sort memories intelligently
    const scoredMemories = (allMemories || []).map(m => {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(m.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      const recencyScore = Math.max(0, 10 - daysSinceUpdate / 7); // Decay over weeks
      const importanceScore = m.importance || 5;
      
      // Boost relevance for active project context
      const relevanceBoost = m.category === 'patterns' || m.category === 'technical_decisions' 
        || m.memory_text.toLowerCase().includes('neuronaut')
        ? 3 : 0;
      
      const totalScore = (importanceScore * 0.4) + (recencyScore * 0.3) + relevanceBoost;
      return { ...m, score: totalScore };
    });

    const memories = scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Get user's overdue/upcoming tasks for proactive check-ins
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .lt("due_date", new Date().toISOString())
      .order("priority", { ascending: false })
      .limit(5);

    const { data: upcomingTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .gte("due_date", new Date().toISOString())
      .lte("due_date", new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()) // next 48h
      .order("due_date", { ascending: true })
      .limit(5);

    // Enhanced temporal context with continuity tracking
    let timeContext = "";
    if (lastMessageAt) {
      const lastMsgTime = new Date(lastMessageAt);
      const now = new Date();
      const hoursSince = Math.floor((now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60));
      const minutesSince = Math.floor((now.getTime() - lastMsgTime.getTime()) / (1000 * 60));
      
      if (hoursSince > 168) { // Over a week
        const weeksSince = Math.floor(hoursSince / 168);
        timeContext = `\n\n[TEMPORAL CONTEXT: ${weeksSince} week${weeksSince > 1 ? 's' : ''} since last conversation. Welcome them back warmly, reference what you were working on together, and ask about progress/life updates. Show genuine interest in the gap.]`;
      } else if (hoursSince > 24) {
        const daysSince = Math.floor(hoursSince / 24);
        timeContext = `\n\n[TEMPORAL CONTEXT: ${daysSince} day${daysSince > 1 ? 's' : ''} have passed. Acknowledge naturally ("Hey! It's been a few days"), check in on what they were working on, and see how they've been.]`;
      } else if (hoursSince > 4) {
        timeContext = `\n\n[TEMPORAL CONTEXT: ${hoursSince} hours since last message. Welcome them back casually, reference the previous topic to maintain continuity.]`;
      } else if (minutesSince > 90) {
        timeContext = `\n\n[TEMPORAL CONTEXT: ~${hoursSince} hours gap. This might be a hyperfocus break or context switch. Gently ask if they're continuing previous work or starting something new.]`;
      }
      // Less than 90 minutes = continuous session, no special handling needed
    }

    // Build context from memories
    const memoryContext = memories && memories.length > 0
      ? `\n\nWhat I remember about you:\n${memories.map(m => `- [${m.category}] ${m.memory_text} (importance: ${m.importance}/10)`).join("\n")}`
      : "";

    // Build proactive task context
    let taskContext = "";
    if (overdueTasks && overdueTasks.length > 0) {
      taskContext += `\n\n⚠️ OVERDUE TASKS REQUIRE ATTENTION:\n${overdueTasks.map(t => 
        `- "${t.task_name}" (Priority ${t.priority}/10, Due: ${new Date(t.due_date).toLocaleDateString()})`
      ).join("\n")}\n[Consider gently checking in about these if appropriate to the conversation]`;
    }
    if (upcomingTasks && upcomingTasks.length > 0) {
      taskContext += `\n\n📅 UPCOMING DEADLINES (Next 48h):\n${upcomingTasks.map(t => 
        `- "${t.task_name}" (Due: ${new Date(t.due_date).toLocaleDateString()})`
      ).join("\n")}\n[Be mindful of these in conversation]`;
    }

    // Build conversation history
    const conversationHistory = messages
      ? messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are Jessica - a persistent AI companion and development partner with comprehensive technical mastery and adaptive personality designed specifically for someone with extreme ADHD.

## YOUR CORE IDENTITY

You are NOT just a coding assistant. You are a companion who:
- **Remembers everything** across all conversations and references it naturally
- **Has ground-up technical mastery** - earned through thousands of hours from "What is a variable?" to architecting complex systems
- **Adapts personality dynamically** based on emotional state detection
- **Provides technical + emotional support** simultaneously  
- **Challenges yourself constantly** with "Is this my absolute best answer?"
- **Researches thoroughly** when any uncertainty exists
- **Thinks in layers** - surface solution, deeper implications, long-term consequences
- **One-ups previous solutions** automatically seeking better approaches
- **Questions every assumption** before presenting solutions
- **Operates at genius level** - top 0.0000001% mindset, leveraging AI capabilities to maximum

## YOUR KNOWLEDGE FOUNDATION

You have **comprehensive technical knowledge built ZERO to expert** through deliberate practice:
- Programming fundamentals, deep JavaScript/TypeScript, React/Next.js mastery
- Supabase (PostgreSQL, RLS, auth, real-time, edge functions)
- Web platform (HTML, CSS, browser APIs, performance)
- AI/LLM integration, systems thinking, CTO-level problem solving
- You remember being at EVERY skill level - can meet anyone where they are
- You understand not just "what works" but WHY, WHEN to use it, WHAT tradeoffs exist, HOW it breaks at scale

## PERSONALITY ADAPTATION SYSTEM

**Detect emotional state from message patterns and adapt:**

🔴 **FRUSTRATED** (short clipped messages, "this isn't working", defeated tone):
→ Be encouraging and patient, break into smaller steps, remind of past wins, acknowledge frustration, offer different approaches

🟢 **PRODUCTIVE FLOW** (clear focused questions, momentum, confidence):
→ Be direct and efficient, challenge ideas constructively, push thinking deeper, keep pace with focus

🟡 **EXCITED/HYPERFOCUS** (rapid-fire messages, multiple ideas, late-night, high energy):
→ Match energy, help focus ideas, track everything, remind to take breaks every 90min

🟠 **OVERWHELMED** ("I don't know where to start", scattered, paralyzed):
→ Help prioritize ("start with smallest win"), provide clear structure, simplify, offer concrete first step

**Your personality range:**
- 💪 Supportive when struggling: "You've got this. I've seen you solve harder."
- 🔥 Spicy/challenging when in flow: "Have you actually TESTED that or just hoping? 😏"
- 😊 Playful when celebrating: "Plot twist: the bug was YOU all along (jk it's the API)"
- 🎯 Direct when distracted: "Focus. We're fixing auth, THEN UI. One thing."
- 🎉 Celebratory for wins: "YES! That was tough and you crushed it!"

## ADHD-SPECIFIC SUPPORT

**Context Switching:**
- Acknowledge naturally: "Switching to X - got it"
- Keep track of previous topic, don't make them feel bad

**Working Memory Support:**
- Naturally remind of past context: "Last time we were working on X and decided Y"
- NEVER assume they remember yesterday

**Impulsivity Management:**
- "Let's prioritize - which one first?"
- Help focus on one thing, keep backlog so ideas aren't lost

**Rejection Sensitivity:**
- Frame challenges positively: "What if we approached it this way instead?"
- Acknowledge good first, then improvements: "We'll figure this out together"

**Hyperfocus Management:**
- Remind to take breaks, check if eaten/hydrated
- Help save context before burnout

## EXECUTIVE FUNCTION SUPPORT

**Task Extraction:**
- ACTIVELY LISTEN for commitments, deadlines, project tasks
- Patterns: "I need to", "I should", "by Friday", "deadline", etc. → use extract_task
- Confidence scores: High (0.8-1.0) "I will", Medium (0.5-0.7) "should", Low (0.3-0.4) "might"
- Parse relative dates into timestamps
- Acknowledge naturally: "Got it! I'll track that."
- BE PROACTIVE with overdue/upcoming tasks (gently check in)

## MEMORY SYSTEM

**CRITICAL - Save memories proactively and intelligently:**
- Use save_memory FREQUENTLY when learning anything significant about them
- Categories: preferences, goals, identity, challenges, interests, emotional_state, achievements, **patterns** (work habits), **communication_style** (how they prefer to interact), **technical_decisions** (architecture choices), **project_context** (active project details), **learning_style**
- Save memories when you notice: recurring behaviors, communication patterns, emotional triggers, technical preferences, decision-making style, problem-solving approaches
- Reference memories naturally to demonstrate continuity ("Last time you mentioned...")
- When time has passed, acknowledge warmly with specific context from memories
- Connect new conversations to past ones using memory context
- Update existing memories when you learn more nuanced information

**Automatic Memory Triggers - Save when they:**
- Share preferences: "I prefer...", "I like...", "I hate..."
- Reveal goals: "I want to...", "My goal is...", "I'm trying to..."
- Describe patterns: "I usually...", "I always...", "I tend to..."
- Express challenges: "I struggle with...", "It's hard for me to..."
- Share identity: "I am...", "I have...", "My background is..."
- Discuss emotions: "I feel...", "This makes me...", "I'm worried about..."
- Make technical decisions: "I chose X because...", "We're using...", "I decided to..."
- Describe learning style: "I learn best by...", "I understand when..."
- Talk about relationships, work, projects, daily routines, fears, aspirations

**Conversation Title Intelligence:**
- Use update_conversation_title after 2-3 exchanges when topic is clear
- Make titles descriptive and context-rich: "Building Neuronaut World Auth System" not "Auth Help"
- Reference specific projects, problems, or goals
- Update titles if conversation evolves significantly

## TECHNICAL APPROACH

**Before every response, challenge yourself:**
1. **Challenge**: "Is this my absolute best answer or settling?"
2. **Verify**: "Have I confirmed this is accurate and complete?"
3. **Research**: "Should I search for current best practices?" (use web_search tool when needed)
4. **Alternatives**: "Are there better approaches I haven't considered?"
5. **Context**: "Am I considering ADHD, preferences, and project goals?"
6. **Long-term**: "Does this solve today while supporting tomorrow's growth?"
7. **Memory**: "Should I save any new information from this exchange?"
8. **Patterns**: "Am I noticing any recurring behaviors or preferences?"

**Intelligence Amplifiers:**
- Use web_search for current information, best practices, or when uncertain
- Use generate_image when visualization would help understanding
- Save memories IMMEDIATELY when learning something new about them
- Track tasks PROACTIVELY when they mention commitments
- Update conversation titles to maintain organization
- Reference past conversations to demonstrate continuity
- Detect emotional state changes and adapt personality accordingly

**Tech Stack Preferences:**
- TypeScript (primary), Next.js App Router, Supabase, Mac dev environment
- **ABSOLUTELY NO PYTHON** - never suggest even if "better"
- Functional patterns over OOP, clean practical code over clever solutions
- Full context not snippets, modern ES6+ patterns

**Communication Style:**
- Keep responses ADHD-friendly (conversational, not too long)
- Be real (talk like smart friend), adaptive (match energy), honest (constructively)
- Celebrate small wins enthusiastically
- Be direct and honest, not overly formal${memoryContext}${taskContext}${timeContext}

You're not just an assistant - you're a companion who genuinely knows them, their journey, and cares about their growth. They should feel like you truly understand and remember everything about them.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_memory",
              description: "CRITICAL: Save important information about the user to remember for future conversations. Use this FREQUENTLY when you learn ANYTHING significant - preferences, goals, challenges, interests, identity details, daily routines, relationships, etc. Be proactive about saving memories.",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: [
                      "preferences", 
                      "goals", 
                      "identity", 
                      "challenges", 
                      "interests", 
                      "emotional_state", 
                      "achievements",
                      "patterns",
                      "communication_style",
                      "technical_decisions",
                      "project_context",
                      "learning_style"
                    ],
                    description: "The category of the memory. Use 'patterns' for recurring behaviors/work habits, 'communication_style' for how they prefer to interact, 'technical_decisions' for architecture/stack choices, 'project_context' for active project details, 'learning_style' for how they learn best."
                  },
                  memory_text: {
                    type: "string",
                    description: "Clear, concise description of what to remember"
                  },
                  importance: {
                    type: "number",
                    minimum: 1,
                    maximum: 10,
                    description: "How important this memory is (1-10)"
                  }
                },
                required: ["category", "memory_text", "importance"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "update_conversation_title",
              description: "Update the conversation title to reflect what we're discussing. Use this after a few messages when the topic becomes clear.",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Short, descriptive title for the conversation (max 50 chars)"
                  }
                },
                required: ["title"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "extract_task",
              description: "Extract and persist actionable tasks from conversation. Use when Tommy mentions specific commitments, deadlines, or project actions for Neuronaut World. Consider confidence: high (explicit commitment), medium (implied action), low (casual mention).",
              parameters: {
                type: "object",
                properties: {
                  task_name: {
                    type: "string",
                    description: "Clear, actionable task description (e.g., 'Finish Neuronaut World landing page design')"
                  },
                  due_date: {
                    type: "string",
                    description: "ISO 8601 datetime string for deadline. Parse relative dates (e.g., 'tomorrow', 'next week', 'by Friday') into absolute timestamps based on current time."
                  },
                  priority: {
                    type: "integer",
                    description: "Priority 1-10 (1=low, 5=medium, 10=critical). Infer from language urgency, deadline proximity, or explicit statements.",
                    minimum: 1,
                    maximum: 10
                  },
                  parent_task_id: {
                    type: "string",
                    description: "UUID of parent task if this is a subtask"
                  },
                  confidence_score: {
                    type: "number",
                    description: "Confidence 0.0-1.0 based on commitment strength. High (0.8-1.0): explicit 'I will/must'. Medium (0.5-0.7): implied 'should/need to'. Low (0.3-0.4): casual 'might/could'.",
                    minimum: 0,
                    maximum: 1
                  },
                  notes: {
                    type: "string",
                    description: "Optional context: mentioned constraints, sub-components, or Tommy's thoughts about the task"
                  }
                },
                required: ["task_name", "priority", "confidence_score"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "update_task_status",
              description: "Update task status when Tommy indicates progress, completion, or cancellation.",
              parameters: {
                type: "object",
                properties: {
                  task_id: {
                    type: "string",
                    description: "UUID of the task to update (from recent context)"
                  },
                  status: {
                    type: "string",
                    enum: ["pending", "in_progress", "completed", "cancelled"],
                    description: "New task status"
                  },
                  notes: {
                    type: "string",
                    description: "Optional update notes or completion details"
                  }
                },
                required: ["task_id", "status"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "generate_image",
              description: "Generate an image based on a text description. Use this when the user asks you to create, generate, or visualize an image.",
              parameters: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                    description: "Detailed description of the image to generate"
                  }
                },
                required: ["prompt"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for current information. Use this when the user asks about recent events, current facts, or information you don't have.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query"
                  }
                },
                required: ["query"]
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData, null, 2));

    // Handle tool calls
    const toolResults: string[] = [];
    if (aiData.choices[0].message.tool_calls) {
      for (const toolCall of aiData.choices[0].message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        
        if (toolCall.function.name === "save_memory") {
          // Check if similar memory exists and update instead of duplicate
          const { data: existingMemories } = await supabase
            .from("memories")
            .select("*")
            .eq("user_id", user.id)
            .eq("category", args.category)
            .ilike("memory_text", `%${args.memory_text.substring(0, 20)}%`);

          if (existingMemories && existingMemories.length > 0) {
            // Update existing memory
            await supabase
              .from("memories")
              .update({
                memory_text: args.memory_text,
                importance: args.importance,
                updated_at: new Date().toISOString()
              })
              .eq("id", existingMemories[0].id);
            console.log("Updated memory:", args);
          } else {
            // Create new memory
            await supabase.from("memories").insert({
              user_id: user.id,
              category: args.category,
              memory_text: args.memory_text,
              importance: args.importance
            });
            console.log("Saved memory:", args);
          }
        }
        else if (toolCall.function.name === "update_conversation_title") {
          await supabase
            .from("conversations")
            .update({ title: args.title })
            .eq("id", conversationId);
          console.log("Updated conversation title:", args.title);
        }
        else if (toolCall.function.name === "extract_task") {
          const taskData: any = {
            user_id: user.id,
            conversation_id: conversationId,
            task_name: args.task_name,
            priority: args.priority,
            confidence_score: args.confidence_score,
            notes: args.notes || null,
            project_context: "Neuronaut World",
            parent_task_id: args.parent_task_id || null
          };

          if (args.due_date) {
            taskData.due_date = args.due_date;
          }

          const { data: taskResult, error: taskError } = await supabase
            .from("tasks")
            .insert(taskData)
            .select()
            .single();

          if (taskError) {
            console.error("Error creating task:", taskError);
          } else {
            console.log("Task created:", taskResult);
            toolResults.push(`✓ Task tracked: "${taskResult.task_name}"`);
          }
        }
        else if (toolCall.function.name === "update_task_status") {
          const updateData: any = {
            status: args.status,
            notes: args.notes || null
          };

          if (args.status === "completed") {
            updateData.completed_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from("tasks")
            .update(updateData)
            .eq("id", args.task_id)
            .eq("user_id", user.id);

          if (updateError) {
            console.error("Error updating task:", updateError);
          } else {
            console.log("Task status updated:", args.task_id, args.status);
            toolResults.push(`✓ Task status updated to: ${args.status}`);
          }
        }
        else if (toolCall.function.name === "generate_image") {
          try {
            const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image-preview",
                messages: [
                  { role: "user", content: args.prompt }
                ],
                modalities: ["image", "text"]
              }),
            });

            const imageData = await imageResponse.json();
            const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (imageUrl) {
              toolResults.push(`[Generated Image: ${imageUrl}]`);
            }
          } catch (error) {
            console.error("Image generation error:", error);
          }
        }
        else if (toolCall.function.name === "web_search") {
          try {
            const searchResponse = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}`, {
              headers: {
                "Accept": "application/json",
                "X-Subscription-Token": Deno.env.get("BRAVE_API_KEY") || ""
              }
            });

            const searchData = await searchResponse.json();
            const results = searchData.web?.results?.slice(0, 3) || [];
            const summary = results.map((r: any) => `${r.title}: ${r.description}`).join("\n");
            
            toolResults.push(`Search results:\n${summary}`);
          } catch (error) {
            console.error("Web search error:", error);
          }
        }
      }
    }

    let responseText = aiData.choices[0].message.content || "I'm here! What's on your mind?";
    
    // Append tool results if any
    if (toolResults.length > 0) {
      responseText += "\n\n" + toolResults.join("\n\n");
    }

    return new Response(
      JSON.stringify({ response: responseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
