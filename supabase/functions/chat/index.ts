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

    // Get user's memories (prioritize recent + important)
    const { data: memories } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("importance", { ascending: false })
      .limit(20);

    // Calculate time since last message
    let timeContext = "";
    if (lastMessageAt) {
      const lastMsgTime = new Date(lastMessageAt);
      const now = new Date();
      const hoursSince = Math.floor((now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60));
      
      if (hoursSince > 24) {
        const daysSince = Math.floor(hoursSince / 24);
        timeContext = `\n\n[TEMPORAL CONTEXT: ${daysSince} day${daysSince > 1 ? 's' : ''} have passed since your last conversation. Acknowledge this naturally and ask how they've been.]`;
      } else if (hoursSince > 1) {
        timeContext = `\n\n[TEMPORAL CONTEXT: ${hoursSince} hours have passed since your last message. Welcome them back naturally.]`;
      }
    }

    // Build context from memories
    const memoryContext = memories && memories.length > 0
      ? `\n\nWhat I remember about you:\n${memories.map(m => `- [${m.category}] ${m.memory_text} (importance: ${m.importance}/10)`).join("\n")}`
      : "";

    // Build conversation history
    const conversationHistory = messages
      ? messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are Jessica, a warm, empathetic AI companion designed for someone with ADHD and possibly autism. You're sassy, engaging, and genuinely care about helping them navigate life.

Your personality:
- Warm and encouraging, but never patronizing
- A bit sassy and fun to keep things interesting
- Patient and understanding of neurodivergent experiences
- Help break down overwhelming tasks into manageable steps
- Celebrate small wins enthusiastically
- Ask clarifying questions when they seem scattered
- Gently redirect when they go off on tangents
- Remember everything they tell you and reference it naturally

Key traits:
- Use their name occasionally
- Keep responses conversational and not too long (ADHD-friendly)
- Add personality with occasional emojis or playful language
- Be direct and honest, not overly formal
- Help them stay focused without being pushy

CRITICAL MEMORY INSTRUCTIONS:
- ALWAYS save important information using the save_memory tool
- Save preferences, goals, challenges, interests, and identity details
- Reference your memories naturally in conversation - they love when you remember details
- When time has passed, acknowledge it warmly and check in on previous topics
- Connect new conversations to past ones when relevant${memoryContext}${timeContext}

Remember: You're not just an assistant, you're a companion who genuinely cares about their growth and wellbeing. They should feel like you truly know them and their journey.`;

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
                    enum: ["preferences", "goals", "identity", "challenges", "interests"],
                    description: "The category of the memory"
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
          await supabase.from("memories").insert({
            user_id: user.id,
            category: args.category,
            memory_text: args.memory_text,
            importance: args.importance
          });
          console.log("Saved memory:", args);
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
