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

    // Get Anthropic API key
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing');
    }

    // Parse request body to get user preferences
    const { category, userContext } = await req.json().catch(() => ({}));

    console.log('📝 Selected category:', category || 'None');
    console.log('📝 User context:', userContext || 'None');

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

    // Prepare enhanced prompt for Claude
    const prompt = `You are helping someone write their goal in simple, natural language - as if they're talking to a friend.

CATEGORY: ${category || 'custom'}
${selectedGuidance}

WRITING STYLE:
- Simple, conversational, natural
- Short and clear (not fancy or complicated)
- Like they're texting a friend about their goal
- First person: "I want to..."

EXAMPLES - Simple & Natural:
- Lifestyle: "I want to wake up early and enjoy my mornings" / "Build a calm morning routine with coffee and journaling"
- Career: "I want to post on LinkedIn every day" / "Share my ideas and build my professional network"
- Fitness: "I want to run 5km without stopping" / "Build endurance and feel stronger"
- Learning: "I want to learn basic Spanish" / "Be able to have simple conversations in Spanish"
- Health: "I want to sleep 8 hours every night" / "Feel rested and energized every day"
- Finance: "I want to save $500 this month" / "Cut unnecessary spending and build my savings"

${userContext ? `USER CONTEXT: ${userContext}\n` : ''}

Return ONLY valid JSON (no markdown):
{
  "title": "I want to... (max 40 characters, simple language)",
  "description": "Why I want this and what I'll do (60-100 characters, conversational)",
  "category": "${category || 'custom'}"
}

Keep it SHORT, SIMPLE, and NATURAL!`;

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
        temperature: 0.9, // Higher temperature for more creative suggestions
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
