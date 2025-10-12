# 🤖 AI Integration - Google Gemini

## Overview
The Genie app uses Google's Gemini AI to generate personalized daily plans for user goals. The AI creates 21-day action plans tailored to each user's specific goals and categories.

## Configuration

### Environment Variables
```bash
# Google AI API Key
EXPO_PUBLIC_GOOGLE_AI_API_KEY=AIzaSyAzHeO1osVlxtsyj_zC5UdbQt4-0YYzFu4
```

### API Integration
- **Model**: `gemini-pro`
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- **Authentication**: API Key-based

## Features

### 1. AI-Powered Plan Generation
- **Input**: Goal title, description, category
- **Output**: 21 personalized daily tasks
- **Fallback**: Template-based plans if AI fails

### 2. Smart Task Creation
- **Progressive tasks** that build on each other
- **Time-based scheduling** (morning/afternoon/evening)
- **Category-specific** recommendations
- **Realistic and achievable** steps

### 3. Multilingual Support
- AI generates plans in user's selected language
- Cultural adaptations for different regions
- Context-aware recommendations

## Implementation

### Frontend Service
```typescript
// src/services/ai/googleAI.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const googleAIService = new GoogleAIService();
await googleAIService.generateGoalPlan(title, description, category);
```

### Backend Edge Function
```typescript
// supabase/functions/generate-plan/index.ts
const taskTemplates = await generateTasksWithAI(category, title, description);
```

### Connection Testing
The app automatically tests AI connectivity on startup and displays status in the dashboard.

## Usage Examples

### Goal: "I want to learn Spanish"
**AI Generated Plan:**
1. Day 1: Download language app and set daily reminder
2. Day 2: Learn basic greetings and introductions
3. Day 3: Practice pronunciation for 15 minutes
4. Day 7: Have first conversation with native speaker
5. Day 14: Watch Spanish movie with subtitles
6. Day 21: Take progress assessment test

### Goal: "I want to start exercising regularly"
**AI Generated Plan:**
1. Day 1: Set fitness goals and choose workout type
2. Day 2: Do 10-minute morning stretch routine
3. Day 3: Take 20-minute walk in neighborhood
4. Day 7: Join gym or set up home workout space
5. Day 14: Complete first full workout routine
6. Day 21: Track progress and plan next phase

## Error Handling

### Fallback Strategy
1. **Primary**: AI-generated personalized plans
2. **Fallback**: Template-based plans by category
3. **Emergency**: Basic goal breakdown tasks

### Connection Issues
- Automatic retry with exponential backoff
- Graceful degradation to templates
- User notification of AI status
- Offline capability with cached plans

## Security

### API Key Protection
- Environment variables only
- No client-side exposure
- Server-side validation
- Rate limiting implemented

### Data Privacy
- No personal data sent to AI
- Goal content only for plan generation
- No storage of AI conversations
- GDPR compliant processing

## Monitoring

### Dashboard Indicators
- 🟢 **Connected**: AI working normally
- 🟡 **Testing**: Checking connection
- 🔴 **Disconnected**: Using template fallback

### Logging
- AI request/response logging
- Error tracking and reporting
- Performance metrics
- Usage analytics

## Future Enhancements

### Planned Features
- **Voice input**: "Genie, I wish to..."
- **Adaptive learning**: Plans improve based on user success
- **Contextual suggestions**: Time/location-aware tasks
- **Progress analysis**: AI-powered insights and recommendations

### Model Upgrades
- **GPT-4 integration**: Alternative AI provider
- **Local AI**: On-device processing for privacy
- **Specialized models**: Category-specific AI models
- **Multimodal**: Image and voice input support

