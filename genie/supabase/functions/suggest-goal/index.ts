import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GoalSuggestion {
  title: string;
  description: string;
  category: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🎲 Suggest Goal Function - Starting...');

    // Parse request body first to get user_id and preferences
    const { category, userContext, userId, title } = await req.json().catch(() => ({}));

    // Get Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If userId provided, check and deduct 1 token for Surprise Me
    let userTokens: { tokens_remaining: number; tokens_used: number } | null = null;
    if (userId) {
      console.log(`👤 User: ${userId}`);
      
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .select('tokens_remaining, tokens_used')
        .eq('user_id', userId)
        .single();

      if (tokenError || !tokenData || tokenData.tokens_remaining < 1) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient tokens. Need 1 token for Surprise Me.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userTokens = tokenData;
    }

    // Get Anthropic API key
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing');
    }

    console.log('📝 Selected category:', category || 'None');
    console.log('📝 User context:', userContext || 'None');
    console.log('📝 User title:', title || 'None (will suggest both title and description)');

    // Determine the mode: autocomplete description OR suggest full goal
    const isAutocompletingDescription = title && title.trim().length > 0;

    // Category-specific guidance for Claude
    const categoryGuidance: Record<string, string> = {
      lifestyle: `Focus on lifestyle improvements: daily habits, wellness routines, work-life balance, home organization, morning/evening rituals, self-care practices, or sustainable living changes.`,
      career: `Focus on professional growth: skill development, networking, career advancement, personal branding, leadership skills, industry knowledge, side projects, or entrepreneurship.`,
      mindset: `Focus on mental transformation: meditation practices, positive thinking patterns, emotional intelligence, stress management, mental resilience, cognitive habits, or mindfulness routines.`,
      character: `Focus on personal values: integrity development, leadership qualities, ethical practices, self-discipline, compassion, authenticity, courage, or moral growth.`,
      goal: `Focus on achievement: milestone completion, challenge conquering, performance improvement, personal records, ambitious targets, or breakthrough accomplishments.`,
      learning: `Focus on knowledge acquisition: new languages, instruments, subjects, technical skills, certifications, reading challenges, or educational pursuits.`,
      health: `Focus on physical wellbeing: nutrition improvement, sleep optimization, preventive health, energy management, body awareness, or holistic wellness.`,
      finance: `Focus on financial growth: budgeting mastery, saving strategies, investment learning, debt reduction, income increase, financial literacy, or money mindset.`,
      social: `Focus on relationships: communication skills, networking, friendship building, community involvement, social confidence, empathy development, or connection deepening.`,
      fitness: `Focus on physical activity: strength building, endurance training, flexibility improvement, sports skills, athletic challenges, movement practices, or body transformation.`,
      creativity: `Focus on creative expression: artistic skills, writing projects, musical development, design thinking, innovation practices, creative hobbies, or imaginative pursuits.`,
      custom: `Focus on unique personal goals: unconventional challenges, hybrid pursuits, niche interests, or personalized growth areas.`,
    };

    const selectedGuidance =
      category && categoryGuidance[category]
        ? categoryGuidance[category]
        : 'Focus on meaningful personal growth and self-improvement.';

    // Generate unique creativity seed for varied suggestions
    const creativitySeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();

    // Prepare enhanced prompt for Claude
    const prompt = isAutocompletingDescription 
      ? `You are helping someone complete their goal description based on the title they wrote.

🚨🚨🚨 LANGUAGE RULE - CRITICAL! 🚨🚨🚨

STEP 1: LOOK at the title text below.
STEP 2: Identify the language:
  → Contains only English (a-z)? = ENGLISH
  → Contains Hebrew (א-ת)? = HEBREW
  → Contains Spanish? = SPANISH

STEP 3: Write description in that EXACT language ONLY!

ABSOLUTELY NO MIXING LANGUAGES!
If title is English → Description in English ONLY
If title is Hebrew → Description in Hebrew ONLY

Only High level of native translations and content writing.

🎯 YOUR MISSION:
The user wrote this title: "${title}"
Complete the description that matches this title - same language, same context, more specific details.

CATEGORY: ${category || 'custom'}
${selectedGuidance}

WRITING STYLE:
- Description in FIRST PERSON ("I want to...")
- Expand the title with MORE specific details
- Like the person is explaining their goal to a friend
- Keep the same language as the title
- Be specific about methods or what exactly they'll do

STRUCTURE:
- DESCRIPTION: "I want to [specific details matching the title, methods, or what exactly they'll do]"

EXAMPLES:

If title is: "I want to wake up at 6am daily"
Description: "I want to build a morning routine with exercise, meditation, and healthy breakfast"

If title is: "אני רוצה ללמוד גיטרה"
Description: "אני רוצה ללמוד אקורדים בסיסיים ולנגן 3 שירים שלמים"

If title is: "Quiero aprender Python"
Description: "Quiero dominar la sintaxis básica y construir 3 proyectos para mi portafolio"

${userContext ? `USER CONTEXT: ${userContext}\n` : ''}

Return ONLY valid JSON (no markdown):
{
  "title": "${title}",
  "description": "I want to... (specific expansion in the SAME LANGUAGE as title, 50-75 chars)",
  "category": "${category || 'custom'}"
}

CRITICAL: The description MUST be in the SAME LANGUAGE as the title "${title}"!`
      : `You are helping someone write their goal in simple, natural language.

🚨🚨🚨 LANGUAGE RULE - CRITICAL! 🚨🚨🚨

DEFAULT LANGUAGE: English (if no specific language detected)

IF userContext contains Hebrew (א-ת) → Write title and description in Hebrew ONLY
IF userContext contains Spanish → Write title and description in Spanish ONLY  
IF userContext is English or empty → Write title and description in English ONLY

ABSOLUTELY NO MIXING LANGUAGES!
Only High level of native translations and content writing.

🎲 CREATIVITY SEED: ${creativitySeed} | Timestamp: ${timestamp}

IMPORTANT: This person is exploring different goal ideas in the ${category || 'custom'} category. 
Generate a UNIQUE, CREATIVE, and FRESH suggestion. Think outside the box and avoid generic goals.
Be specific, innovative, and inspiring. Each suggestion should feel distinctly different.

CATEGORY: ${category || 'custom'}
${selectedGuidance}

WRITING STYLE:
- Both title AND description in FIRST PERSON
- Title: "I want to..." (the main goal)
- Description: "I want to..." (expand with MORE specific details)
- Like the person is explaining their goal to a friend

STRUCTURE:
- TITLE: "I want to [main goal]"
- DESCRIPTION: "I want to [specific details, methods, or what exactly they'll do]"

EXAMPLES - Both in First Person:

Lifestyle:
Title: "I want to wake up at 6am daily"
Description: "I want to build a morning routine with exercise, meditation, and healthy breakfast"

Career:
Title: "I want to learn Python"
Description: "I want to master basic syntax and build 3 projects for my portfolio"

Fitness:
Title: "I want to run 5km non-stop"
Description: "I want to train 4x weekly and improve my endurance and breathing"

Learning:
Title: "I want to speak basic Spanish"
Description: "I want to learn 300 phrases and practice conversations 20 min daily"

Health:
Title: "I want to sleep 8 hours nightly"
Description: "I want to create a bedtime routine and optimize my sleep environment"

Finance:
Title: "I want to save $500"
Description: "I want to track expenses and eliminate 3 subscriptions this month"

${userContext ? `USER CONTEXT: ${userContext}\n` : ''}

Return ONLY valid JSON (no markdown):
{
  "title": "I want to... (main goal, 30-40 chars)",
  "description": "I want to... (specific expansion, 50-75 chars)",
  "category": "${category || 'custom'}"
}

CRITICAL: BOTH title and description MUST start with "I want to..." - first person only!`;

    console.log('🤖 Calling Claude API...');

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1024,
        temperature: 1.0, // Maximum temperature for maximum creativity and variation
        thinking: {
          type: 'disabled',
        },
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Claude API response received');

    // Extract token usage
    const tokenUsage = data.usage
      ? {
          input: data.usage.input_tokens || 0,
          output: data.usage.output_tokens || 0,
          total:
            (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        }
      : null;

    if (tokenUsage) {
      console.log(
        `💰 Token usage - Input: ${tokenUsage.input}, Output: ${tokenUsage.output}, Total: ${tokenUsage.total}`
      );
    }

    // Extract the suggestion from Claude's response
    const textContent = data.content?.[0]?.text;
    if (!textContent) {
      throw new Error('No content in Claude response');
    }

    console.log('📄 Raw Claude response:', textContent);

    // Parse JSON from response (handle potential markdown code blocks)
    let suggestion: GoalSuggestion;
    try {
      const cleanedText = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      suggestion = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Failed to parse Claude response:', parseError);
      throw new Error('Failed to parse goal suggestion from AI');
    }

    // Validate the suggestion
    if (!suggestion.title || !suggestion.description || !suggestion.category) {
      throw new Error('Invalid goal suggestion structure');
    }

    // Validate category
    const validCategories = [
      'lifestyle',
      'career',
      'mindset',
      'character',
      'goal',
      'learning',
      'health',
      'finance',
      'social',
      'fitness',
      'creativity',
      'custom',
    ];

    if (!validCategories.includes(suggestion.category)) {
      console.warn(
        `⚠️ Invalid category "${suggestion.category}", defaulting to "custom"`
      );
      suggestion.category = 'custom';
    }

    console.log('✨ Goal suggestion generated:', {
      title: suggestion.title,
      category: suggestion.category,
    });

    // Deduct 1 token if user provided
    if (userId && userTokens) {
      await supabase
        .from('user_tokens')
        .update({
          tokens_remaining: userTokens.tokens_remaining - 1,
          tokens_used: (userTokens.tokens_used || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`💳 Token deducted: 1 token for Surprise Me. Remaining: ${userTokens.tokens_remaining - 1}`);
    }

    // Save to ai_runs for tracking (optional - no goal_id yet)
    if (tokenUsage) {
      try {
        const { data: costData } = await supabase.rpc('calculate_ai_cost', {
          model_name: 'claude-3-7-sonnet-20250219',
          input_tokens_count: tokenUsage.input,
          output_tokens_count: tokenUsage.output,
        });

        const estimatedCost = costData || 0;

        await supabase.from('ai_runs').insert({
          goal_id: null, // No goal yet - just a suggestion
          stage: 'suggestion',
          status: 'success',
          provider_model: 'claude-3-7-sonnet-20250219',
          input_tokens: tokenUsage.input,
          output_tokens: tokenUsage.output,
          total_tokens: tokenUsage.total,
          cost_usd: estimatedCost,
          metadata: {
            category: suggestion.category,
            title_length: suggestion.title.length,
            desc_length: suggestion.description.length,
          },
          completed_at: new Date().toISOString(),
        });

        console.log(`💰 Suggestion cost: $${estimatedCost.toFixed(6)}`);
      } catch (trackingError) {
        console.warn(
          '⚠️ Failed to save ai_run tracking (non-critical):',
          trackingError
        );
      }
    }

    // Return the suggestion
    return new Response(
      JSON.stringify({
        success: true,
        data: suggestion,
        model: 'claude-3-7-sonnet-20250219',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error in suggest-goal function:', error);
    console.error(
      '❌ Error details:',
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      '❌ Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    );

    // Parse category from request for fallback
    let category = 'custom';
    try {
      const body = await req.json().catch(() => ({}));
      category = body.category || 'custom';
    } catch {
      console.log('Could not parse request body for fallback');
    }

    // Category-specific fallback suggestions
    const fallbackByCategory: Record<string, GoalSuggestion[]> = {
      lifestyle: [
        {
          title: 'I want to master the art of slow mornings',
          description:
            "I want to create a luxurious 45-minute morning ritual with stretching, journaling, and mindful breakfast. I struggle with rushing in the morning, but I'm committed to starting each day feeling energized and centered.",
          category: 'lifestyle',
        },
        {
          title: 'I want to take the digital sunset challenge',
          description:
            "I want to eliminate screens after 8 PM for 21 days. I spend too much time scrolling, but I'm ready to replace it with reading, hobbies, and real conversations for peaceful evenings.",
          category: 'lifestyle',
        },
        {
          title: 'I want to transform my home into a sanctuary',
          description:
            "I want to declutter and organize one space daily for 21 days. My environment feels chaotic, but I'm ready to create a calm, intentional space that sparks joy.",
          category: 'lifestyle',
        },
      ],
      career: [
        {
          title: 'I want to become a LinkedIn thought leader',
          description:
            "I want to post valuable insights daily for 21 days to build my professional brand. I'm ready to overcome my fear of sharing ideas publicly and position myself as an industry expert.",
          category: 'career',
        },
        {
          title: 'I want to start meaningful coffee chats',
          description:
            "I want to have one genuine professional conversation weekly to expand my network. I've been isolated in my career, but I'm ready to build 7 valuable connections and discover new opportunities.",
          category: 'career',
        },
        {
          title: 'I want to master my superpower skill',
          description:
            "I want to dedicate 1 hour daily to mastering one career-critical skill. I'm ready to become the go-to expert my team relies on and accelerate my career growth.",
          category: 'career',
        },
      ],
      mindset: [
        {
          title: "I want to train my brain's pause button",
          description:
            "I want to practice 5-minute mindful pauses before reacting to stress. I often react impulsively, but I'm committed to rewiring my response patterns and developing unshakeable mental calm.",
          category: 'mindset',
        },
        {
          title: 'I want to reframe my inner critic',
          description:
            "I want to document negative thoughts and consciously reframe them positively. I struggle with self-doubt, but I'm ready to transform it into self-compassion over 21 days.",
          category: 'mindset',
        },
        {
          title: 'I want to build meditation momentum',
          description:
            "I want to meditate 10 minutes daily, gradually increasing to 20. I know meditation can help, but I'm finally ready to build a sustainable practice that brings clarity and peace.",
          category: 'mindset',
        },
      ],
      character: [
        {
          title: 'I want to take the gratitude challenge',
          description:
            "I want to write one heartfelt thank-you note daily to people who impacted my life. I sometimes take relationships for granted, but I'm ready to strengthen connections and cultivate deep appreciation.",
          category: 'character',
        },
        {
          title: 'I want to practice radical honesty',
          description:
            "I want to commit to authentic, kind truth-telling for 21 days. I've held back too often, but I'm ready to build integrity, deepen relationships, and discover the freedom of authenticity.",
          category: 'character',
        },
        {
          title: 'I want to do daily acts of kindness',
          description:
            "I want to perform one deliberate act of kindness each day. I know the world needs more compassion, and I'm ready to transform my character through consistent compassionate action.",
          category: 'character',
        },
      ],
      learning: [
        {
          title: 'I want to learn conversational Japanese',
          description:
            "I want to master 300 essential phrases and hold my first 5-minute conversation in Japanese. I've always been fascinated by the language, and I'm excited to finally make real progress.",
          category: 'learning',
        },
        {
          title: 'I want to read 21 books in 21 days',
          description:
            "I want to speed-read one book daily using proven techniques. I have so many books I've been meaning to read, and I'm ready to absorb massive knowledge and become a learning machine.",
          category: 'learning',
        },
        {
          title: 'I want to master a musical instrument',
          description:
            "I want to practice 30 minutes daily and go from zero to playing my first complete song confidently. I've always wished I could play music, and I'm finally ready to make it happen.",
          category: 'learning',
        },
      ],
      health: [
        {
          title: 'I want to sleep like an elite athlete',
          description:
            "I want to optimize my sleep environment, routine, and habits to achieve consistent 8-hour deep sleep. I've been exhausted for too long, and I'm ready to wake up refreshed every single day.",
          category: 'health',
        },
        {
          title: 'I want to start a hydration revolution',
          description:
            "I want to drink 3 liters of water daily for 21 days. I know I'm dehydrated, and I'm ready to track my energy levels and watch my skin, digestion, and vitality transform.",
          category: 'health',
        },
        {
          title: 'I want to try plant-based eating',
          description:
            "I want to explore 21 days of plant-based eating to discover delicious recipes and boost my energy. I'm curious about the health benefits, and I'm ready to feel the difference in my body.",
          category: 'health',
        },
      ],
      finance: [
        {
          title: 'I want to save $500 in 21 days',
          description:
            "I want to find creative ways to save $500 by cutting unnecessary expenses and discovering money leaks. I need a financial cushion, and I'm ready to build it and feel more secure.",
          category: 'finance',
        },
        {
          title: 'I want to complete a financial literacy bootcamp',
          description:
            "I want to learn one key financial concept daily to master budgeting, investing basics, and money psychology. I've avoided finances too long, but I'm ready to take control in just 3 weeks.",
          category: 'finance',
        },
        {
          title: 'I want to take the no-spend challenge',
          description:
            "I want to commit to zero discretionary spending for 21 days. I spend mindlessly too often, but I'm ready to reset my relationship with money and discover what truly matters.",
          category: 'finance',
        },
      ],
      social: [
        {
          title: 'I want to start the deep connection project',
          description:
            "I want to have 7 meaningful one-on-one conversations that go beyond small talk. I miss genuine intimacy with people I care about, and I'm ready to build deeper relationships.",
          category: 'social',
        },
        {
          title: 'I want to master conversation skills',
          description:
            "I want to practice one active listening technique daily. I sometimes talk too much, but I'm ready to transform my relationships through the power of truly being present.",
          category: 'social',
        },
        {
          title: 'I want to start a compliment campaign',
          description:
            "I want to give 3 genuine, specific compliments daily. I know kindness matters, and I'm ready to brighten lives, strengthen bonds, and become a source of positivity.",
          category: 'social',
        },
      ],
      fitness: [
        {
          title: 'I want to do 100 push-ups in a row',
          description:
            "I want to progress from my current level to 100 continuous push-ups through consistent daily training. I'm ready to build impressive upper body strength and prove I can do hard things.",
          category: 'fitness',
        },
        {
          title: 'I want to go from couch to 5K',
          description:
            "I want to go from zero to running 5K non-stop. I've been inactive for too long, but I'm ready to build endurance, get fit, and prove to myself I can achieve anything I commit to.",
          category: 'fitness',
        },
        {
          title: 'I want to start a flexibility revolution',
          description:
            "I want to practice yoga or stretching 20 minutes daily. My body feels stiff and painful, but I'm ready to transform my range of motion, reduce pain, and feel years younger.",
          category: 'fitness',
        },
      ],
      creativity: [
        {
          title: 'I want to ignite my daily creative spark',
          description:
            "I want to create one piece of art, music, or writing daily for 21 days. I've been holding back my creativity, but I'm ready to unlock my creative flow and build an impressive portfolio.",
          category: 'creativity',
        },
        {
          title: 'I want to capture life through photography',
          description:
            "I want to capture and edit one beautiful photo daily. I see beauty everywhere, and I'm ready to develop my artistic eye and create a stunning visual journal of my life.",
          category: 'creativity',
        },
        {
          title: 'I want to write my story',
          description:
            "I want to write 500 words daily to complete a short story or memoir chapter. I have stories inside me, and I'm ready to build a sustainable writing habit and share them with the world.",
          category: 'creativity',
        },
      ],
      goal: [
        {
          title: 'I want to attempt the impossible',
          description:
            "I want to try something I thought was impossible and break it into 21 daily steps. I've limited myself for too long, and I'm ready to prove to myself there are no limits.",
          category: 'goal',
        },
        {
          title: 'I want to master a fear',
          description:
            "I want to face one fear-related challenge daily to gradually build courage. Fear has held me back, but I'm ready to expand my comfort zone dramatically and live more freely.",
          category: 'goal',
        },
        {
          title: 'I want to achieve peak performance',
          description:
            "I want to optimize my daily routine for maximum productivity. I know I can do better, and I'm ready to track and improve my personal best in my key life area.",
          category: 'goal',
        },
      ],
      custom: [
        {
          title: 'I want to master a new language',
          description:
            "I want to learn conversational basics in a language I've always wanted to speak. I'll face challenges with pronunciation and vocabulary, but I'm excited to confidently greet someone in a new language!",
          category: 'custom',
        },
        {
          title: 'I want to build a morning mindfulness ritual',
          description:
            "I want to create a powerful 15-minute morning routine combining meditation, gratitude, and intention-setting. Consistency is my challenge, but I'm ready to feel more centered and focused each day.",
          category: 'custom',
        },
        {
          title: 'I want to run my first 5K',
          description:
            "I want to train from zero to running a full 5K. I know I'll struggle with motivation on hard days, but I'm ready to cross that finish line and prove I can achieve anything I commit to.",
          category: 'custom',
        },
      ],
    };

    const categorySuggestions =
      fallbackByCategory[category as string] || fallbackByCategory.custom;
    const randomSuggestion =
      categorySuggestions[
        Math.floor(Math.random() * categorySuggestions.length)
      ];

    return new Response(
      JSON.stringify({
        success: true,
        data: randomSuggestion,
        model: 'fallback',
        note: 'Using fallback suggestion due to API error',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
