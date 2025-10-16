export interface LoadingMessage {
  id: string;
  text: string;
  category: string;
  timeRange?: string;
  days?: string[];
}

export const generateLoadingMessages = (
  goalTitle: string,
  goalDescription: string,
  category: string,
  preferredTimeRanges: Array<{ label: string; start_hour: number; end_hour: number }> = [],
  preferredDays: number[] = [],
  planDurationDays: number = 21
): LoadingMessage[] => {
  const messages: LoadingMessage[] = [];

  // Day names mapping
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDays = preferredDays.length > 0 
    ? preferredDays.map(day => dayNames[day]).join(', ')
    : 'All days of the week';

  // Time ranges text
  const timeRangesText = preferredTimeRanges.length > 0
    ? preferredTimeRanges.map(range => `${range.label} (${range.start_hour}:00-${range.end_hour}:00)`).join(', ')
    : 'Flexible times';

  // Category-specific messages
  const categoryMessages = {
    lifestyle: [
      "🎯 I'm analyzing your goal for a healthy and balanced lifestyle...",
      "💡 Checking how to integrate this goal into your daily routine...",
      "🌱 Planning gradual changes that will become permanent habits...",
      "⚖️ Balancing between the goal and your existing life...",
      "🔄 Creating a support system to help you maintain consistency...",
    ],
    career: [
      "💼 Analyzing your professional goal in depth...",
      "📈 Planning a personalized career advancement path...",
      "🎓 Checking what skills are needed to achieve the goal...",
      "🤝 Planning a network that will support your professional development...",
      "📊 Creating clear and measurable success metrics...",
    ],
    mindset: [
      "🧠 Analyzing your current thinking patterns...",
      "💭 Planning thinking exercises that will strengthen the goal...",
      "🎯 Creating a belief system that will support achieving the goal...",
      "🔄 Planning gradual change in thinking patterns...",
      "💪 Building mental resilience to help you cope with challenges...",
    ],
    character: [
      "⭐ Analyzing your personal traits...",
      "🎭 Planning development of traits that will strengthen character...",
      "🌟 Creating a personalized personal development path...",
      "💎 Planning to strengthen existing positive traits...",
      "🚀 Building a path for meaningful personal growth...",
    ],
    custom: [
      "🎯 Analyzing your special goal...",
      "🔍 Checking all relevant aspects...",
      "💡 Planning a unique approach to achieving the goal...",
      "🎨 Creating a plan tailored specifically for you...",
      "✨ Planning a unique path that will fit you perfectly...",
    ]
  };

  // Time-specific messages
  const timeMessages = preferredTimeRanges.length > 0 ? [
    `⏰ Planning tasks according to your time preferences: ${timeRangesText}...`,
    `🕐 Adapting the plan to your preferred activity hours...`,
    `📅 Checking how to integrate the goal into the hours you chose...`,
    `⏱️ Planning tasks that will fit your life pace...`,
    `🕒 Creating a plan that will respect the times you chose...`,
  ] : [
    "⏰ Planning flexible times that will fit your routine...",
    "🕐 Checking the best times to perform tasks...",
    "📅 Planning a program that will integrate into daily routine...",
    "⏱️ Creating flexibility in times to make execution easier...",
    "🕒 Planning times that will fit your life pace...",
  ];

  // Days-specific messages
  const daysMessages = preferredDays.length > 0 ? [
    `📅 Planning a program for the days you chose: ${selectedDays}...`,
    `🗓️ Adapting tasks to your active days...`,
    `📆 Checking how to integrate the goal into preferred days...`,
    `🗓️ Creating a plan that will respect your activity days...`,
    `📅 Planning tasks that will fit your schedule...`,
  ] : [
    "📅 Planning a program for all days of the week...",
    "🗓️ Checking how to integrate the goal into daily routine...",
    "📆 Creating flexibility in days to make execution easier...",
    "🗓️ Planning a program that will integrate into all days of the week...",
    "📅 Checking the best days to perform tasks...",
  ];

  // Duration-specific messages
  const durationMessages = [
    `📊 Planning a ${planDurationDays}-day program to achieve the goal...`,
    `🎯 Creating a gradual path of ${planDurationDays} days...`,
    `📈 Planning daily progress for ${planDurationDays} days...`,
    `🔄 Building a long-term plan of ${planDurationDays} days...`,
    `⏳ Planning a ${planDurationDays}-day journey to achieve the goal...`,
  ];

  // Goal-specific messages
  const goalMessages = [
    `🎯 Focusing on the goal: "${goalTitle}"...`,
    `💭 Analyzing the description: "${goalDescription.substring(0, 50)}${goalDescription.length > 50 ? '...' : ''}"...`,
    `🔍 Checking all aspects of your goal...`,
    `💡 Planning a personalized approach to achieving the goal...`,
    `🎨 Creating a unique plan for your goal...`,
  ];

  // Process messages
  const processMessages = [
    "🤖 Activating advanced artificial intelligence...",
    "🧠 Processing information using advanced algorithms...",
    "📊 Analyzing relevant patterns and trends...",
    "🔬 Checking research and similar case studies...",
    "💻 Calculating thousands of different possibilities...",
    "🎯 Filtering the best options...",
    "📝 Creating a detailed and accurate plan...",
    "✅ Checking the plan against professional criteria...",
    "🔧 Adapting the plan to your preferences...",
    "🎨 Adding personal and unique elements...",
    "📋 Creating a detailed task list...",
    "⏰ Planning precise times for each task...",
    "🎁 Planning a rewards and incentives system...",
    "📈 Creating progress and tracking metrics...",
    "🔄 Planning adaptation and improvement mechanisms...",
    "💪 Building a support and motivation system...",
    "🎯 Planning intermediate goals and small targets...",
    "📊 Creating a measurement and evaluation system...",
    "🔍 Checking the plan against current research...",
    "✨ Adding elements of creativity and innovation...",
    "🎭 Planning different approaches for each stage...",
    "🧩 Building a personalized plan...",
    "🚀 Planning a fast and efficient path to achieve the goal...",
    "💎 Creating a quality and professional plan...",
    "🎨 Adding elements of enjoyment and satisfaction...",
    "🔧 Planning mechanisms to deal with difficulties...",
    "📚 Including relevant resources and tools...",
    "🎯 Planning clear and measurable goals...",
    "💡 Creating creative solutions to challenges...",
    "🌟 Planning a learning and development experience...",
  ];

  // Motivation messages
  const motivationMessages = [
    "🌟 I'm creating a plan that will change your life...",
    "💫 Your goal is important to me and I'm planning carefully...",
    "🎯 I believe you can achieve this goal...",
    "💪 I'm building a plan that will strengthen your confidence...",
    "🚀 I'm planning a path that will lead you to success...",
    "✨ I'm creating an experience that will be enjoyable and satisfying...",
    "🎨 I'm planning a program that will fit you perfectly...",
    "💎 I'm building something special and unique for you...",
    "🌟 I'm planning a journey that will be meaningful for you...",
    "🎯 I'm creating a plan that will help you achieve your dream...",
  ];

  // Final messages
  const finalMessages = [
    "🎉 Almost done! Your plan is almost ready...",
    "✨ I'm adding the final details...",
    "🎯 Checking that everything is perfect for you...",
    "💫 Adding the final magic...",
    "🌟 Your plan is almost ready!...",
    "🎨 Adding the final touches...",
    "💎 Checking that everything is perfect...",
    "🚀 Almost finished creating the perfect plan...",
    "✨ Adding the final details...",
    "🎯 Your plan is almost ready!...",
  ];

  // Combine all messages
  const allMessages = [
    ...categoryMessages[category as keyof typeof categoryMessages] || categoryMessages.custom,
    ...goalMessages,
    ...timeMessages,
    ...daysMessages,
    ...durationMessages,
    ...processMessages,
    ...motivationMessages,
    ...finalMessages,
  ];

  // Generate 1000 messages by repeating and varying
  for (let i = 0; i < 1000; i++) {
    const baseMessage = allMessages[i % allMessages.length];
    const variation = Math.floor(i / allMessages.length);
    
    let message = baseMessage;
    
    // Add variations
    if (variation > 0) {
      const variations = [
        " 🔄",
        " 💭",
        " ⚡",
        " 🎯",
        " ✨",
        " 💡",
        " 🚀",
        " 🌟",
        " 💪",
        " 🎨",
      ];
      message += variations[variation % variations.length];
    }

    messages.push({
      id: `msg_${i}`,
      text: message,
      category,
      timeRange: timeRangesText,
      days: preferredDays.length > 0 ? preferredDays.map(day => dayNames[day]) : ['All days of the week'],
    });
  }

  return messages;
};

export const getRandomLoadingMessage = (
  goalTitle: string,
  goalDescription: string,
  category: string,
  preferredTimeRanges: Array<{ label: string; start_hour: number; end_hour: number }> = [],
  preferredDays: number[] = [],
  planDurationDays: number = 21
): string => {
  const messages = generateLoadingMessages(goalTitle, goalDescription, category, preferredTimeRanges, preferredDays, planDurationDays);
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex].text;
};
