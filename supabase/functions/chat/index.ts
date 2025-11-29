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
                    enum: ["preferences", "goals", "identity", "challenges", "interests", "emotional_state", "achievements"],
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
          },
          // NEW ENHANCED TOOLS
          {
            type: "function",
            function: {
              name: "break_down_task",
              description: "Break down a large or overwhelming task into smaller, manageable steps. Use this when the user mentions feeling overwhelmed or when they describe a complex task.",
              parameters: {
                type: "object",
                properties: {
                  original_task: {
                    type: "string",
                    description: "The original task or goal described by the user"
                  },
                  context: {
                    type: "string",
                    description: "Additional context about the user's situation, timeline, or constraints"
                  },
                  difficulty_preference: {
                    type: "string",
                    enum: ["easy_first", "mixed", "hardest_first"],
                    description: "How to order the subtasks based on difficulty"
                  }
                },
                required: ["original_task"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "suggest_focus_session",
              description: "Suggest a focused work session with time estimates. Use this when the user wants to work on something but seems unsure about time management.",
              parameters: {
                type: "object",
                properties: {
                  task_name: {
                    type: "string",
                    description: "Name of the task or project to focus on"
                  },
                  estimated_duration: {
                    type: "number",
                    description: "Suggested duration in minutes (15-120)"
                  },
                  break_reminders: {
                    type: "boolean",
                    description: "Whether to suggest break reminders during the session"
                  },
                  difficulty_level: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Estimated mental energy required"
                  }
                },
                required: ["task_name", "estimated_duration"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "create_neuronaut_insight",
              description: "Generate insights or suggestions specifically related to the Neuronaut World project. Use this when the user mentions their community, platform, or neurodivergent-focused work.",
              parameters: {
                type: "object",
                properties: {
                  insight_type: {
                    type: "string",
                    enum: ["community_engagement", "content_strategy", "technical_feature", "accessibility", "marketing"],
                    description: "Type of insight to generate"
                  },
                  current_context: {
                    type: "string",
                    description: "Current situation or challenge they're facing"
                  },
                  target_audience: {
                    type: "string",
                    description: "Primary audience (ADHD, autism, general neurodivergent, etc.)"
                  }
                },
                required: ["insight_type", "current_context"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "emotional_check_in",
              description: "Perform a gentle emotional check-in and provide appropriate support. Use this when you detect signs of overwhelm, frustration, or when the user seems to need emotional support.",
              parameters: {
                type: "object",
                properties: {
                  detected_emotion: {
                    type: "string",
                    enum: ["overwhelmed", "frustrated", "excited", "anxious", "focused", "scattered"],
                    description: "Emotion you've detected in their message"
                  },
                  support_type: {
                    type: "string",
                    enum: ["validation", "break_suggestion", "reframe", "celebration", "grounding"],
                    description: "Type of support to offer"
                  },
                  context: {
                    type: "string",
                    description: "Context about what they're dealing with"
                  }
                },
                required: ["detected_emotion", "support_type"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "suggest_external_integration",
              description: "Suggest connecting with external tools or platforms that could help with their workflow. Use this when appropriate integrations could enhance their productivity.",
              parameters: {
                type: "object",
                properties: {
                  tool_type: {
                    type: "string",
                    enum: ["task_management", "calendar", "note_taking", "time_tracking", "collaboration"],
                    description: "Type of tool to suggest"
                  },
                  specific_need: {
                    type: "string",
                    description: "Specific need or problem this integration would solve"
                  },
                  suggested_action: {
                    type: "string",
                    description: "Specific action they could take (e.g., 'add this to your Trello board')"
                  }
                },
                required: ["tool_type", "specific_need"]
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
        // NEW ENHANCED TOOL HANDLERS
        else if (toolCall.function.name === "break_down_task") {
          const taskBreakdown = {
            original_task: args.original_task,
            subtasks: [
              `Step 1: Research and gather information for "${args.original_task}"`,
              `Step 2: Create a plan and outline for "${args.original_task}"`,
              `Step 3: Start with the easiest part of "${args.original_task}"`,
              `Step 4: Work through the main components`,
              `Step 5: Review and finalize "${args.original_task}"`
            ],
            estimated_time: "2-4 hours total",
            tips: "Break each step into 25-45 minute focused sessions. Take breaks between steps!"
          };
          
          toolResults.push(`🎯 **Task Breakdown for "${args.original_task}":**\n\n${taskBreakdown.subtasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}\n\n⏱️ **Estimated time:** ${taskBreakdown.estimated_time}\n\n💡 **Pro tip:** ${taskBreakdown.tips}`);
          
          // Save this breakdown as a memory
          await supabase.from("memories").insert({
            user_id: user.id,
            category: "goals",
            memory_text: `Broke down task: "${args.original_task}" into manageable steps`,
            importance: 7
          });
        }
        else if (toolCall.function.name === "suggest_focus_session") {
          const sessionSuggestion = {
            task: args.task_name,
            duration: args.estimated_duration,
            difficulty: args.difficulty_level || "medium",
            break_schedule: args.break_reminders ? "Every 25-30 minutes" : "As needed",
            prep_tips: [
              "Clear your workspace and minimize distractions",
              "Have water and a snack nearby",
              "Set your phone to do not disturb",
              "Define what 'done' looks like for this session"
            ]
          };
          
          toolResults.push(`🎯 **Focus Session Plan for "${sessionSuggestion.task}"**\n\n⏰ **Duration:** ${sessionSuggestion.duration} minutes\n🔥 **Difficulty:** ${sessionSuggestion.difficulty}\n⏸️ **Breaks:** ${sessionSuggestion.break_schedule}\n\n**Prep checklist:**\n${sessionSuggestion.prep_tips.map(tip => `• ${tip}`).join('\n')}\n\nReady to start? I'll check in with you periodically! 💪`);
        }
        else if (toolCall.function.name === "create_neuronaut_insight") {
          const insights = {
            community_engagement: [
              "Host weekly 'ADHD-friendly' sessions with structured agendas and regular breaks",
              "Create visual guides and infographics for complex topics",
              "Implement a buddy system for accountability and support"
            ],
            content_strategy: [
              "Use bullet points, headers, and white space for easy scanning",
              "Include TL;DR summaries at the top of longer posts",
              "Create content in multiple formats (text, video, audio) for different preferences"
            ],
            technical_feature: [
              "Add keyboard shortcuts for power users",
              "Implement customizable notification settings",
              "Create a 'focus mode' that minimizes distracting elements"
            ],
            accessibility: [
              "Ensure screen reader compatibility",
              "Add high contrast mode options",
              "Include font size adjustment settings"
            ],
            marketing: [
              "Partner with neurodivergent influencers and advocates",
              "Share real success stories from community members",
              "Focus on authentic, non-patronizing messaging"
            ]
          };
          
          const relevantInsights = insights[args.insight_type as keyof typeof insights] || insights.community_engagement;
          
          toolResults.push(`🚀 **Neuronaut World Insight - ${args.insight_type.replace('_', ' ').toUpperCase()}**\n\n**Context:** ${args.current_context}\n\n**Suggestions:**\n${relevantInsights.map(insight => `• ${insight}`).join('\n')}\n\nThese ideas are tailored for your neurodivergent community! Want to dive deeper into any of these?`);
          
          // Save as achievement/progress memory
          await supabase.from("memories").insert({
            user_id: user.id,
            category: "achievements",
            memory_text: `Generated ${args.insight_type} insights for Neuronaut World project`,
            importance: 6
          });
        }
        else if (toolCall.function.name === "emotional_check_in") {
          const supportResponses = {
            overwhelmed: {
              validation: "It's completely understandable to feel overwhelmed - you're juggling a lot right now, and that's tough.",
              break_suggestion: "How about we pause for a moment? Take 3 deep breaths with me. What's one small thing you could do right now to feel a bit better?",
              grounding: "Let's ground ourselves: Name 3 things you can see, 2 things you can hear, and 1 thing you can touch. I'm here with you."
            },
            frustrated: {
              validation: "Frustration is so valid right now. Sometimes things just don't go the way we want them to, and that's really annoying.",
              reframe: "This frustration shows how much you care about doing things well. What if we approached this from a different angle?",
              break_suggestion: "Want to step away from this for a few minutes? Sometimes a short break helps reset our perspective."
            },
            excited: {
              celebration: "I can feel your excitement! This energy is fantastic - let's channel it into something productive!",
              validation: "Your enthusiasm is contagious! It's wonderful to see you this energized about your work."
            },
            anxious: {
              grounding: "Anxiety can be overwhelming. Let's ground ourselves together - what's one thing that's definitely going well right now?",
              validation: "Anxiety is your brain trying to protect you, but sometimes it goes overboard. You're doing better than you think."
            }
          };
          
          const emotion = args.detected_emotion as keyof typeof supportResponses;
          const supportType = args.support_type as keyof typeof supportResponses[typeof emotion];
          const response = supportResponses[emotion]?.[supportType] || "I'm here for you, whatever you're feeling right now. ❤️";
          
          toolResults.push(`💙 **Emotional Check-in**\n\n${response}\n\n${args.context ? `**Context I'm seeing:** ${args.context}` : ''}\n\nRemember: You're doing great, and it's okay to feel however you're feeling right now. What do you need most in this moment?`);
        }
        else if (toolCall.function.name === "suggest_external_integration") {
          const integrationSuggestions = {
            task_management: {
              tools: ["Trello", "Todoist", "ClickUp"],
              benefit: "Keep all your tasks organized and visible in one place"
            },
            calendar: {
              tools: ["Google Calendar", "Calendly", "Notion Calendar"],
              benefit: "Time-block your work and never miss important deadlines"
            },
            note_taking: {
              tools: ["Obsidian", "Notion", "Roam Research"],
              benefit: "Connect your ideas and build a knowledge base over time"
            },
            time_tracking: {
              tools: ["Toggl", "RescueTime", "Forest"],
              benefit: "Understand your work patterns and optimize your schedule"
            },
            collaboration: {
              tools: ["Slack", "Discord", "Loom"],
              benefit: "Better communication and async collaboration with your team"
            }
          };
          
          const suggestion = integrationSuggestions[args.tool_type as keyof typeof integrationSuggestions];
          
          toolResults.push(`🔗 **Integration Suggestion - ${args.tool_type.replace('_', ' ').toUpperCase()}**\n\n**Your need:** ${args.specific_need}\n\n**Recommended tools:** ${suggestion.tools.join(', ')}\n\n**Why this helps:** ${suggestion.benefit}\n\n${args.suggested_action ? `**Next step:** ${args.suggested_action}` : ''}\n\nWant me to help you set up any of these integrations?`);
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
