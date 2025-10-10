# 🧞‍♂️ Genie - Personal Growth Companion

Transform your wishes into achievable daily plans with your personal Genie companion.

## ✨ Features

- **🎯 Goal Setting**: Create personalized goals across lifestyle, career, mindset, and character categories
- **📋 Daily Plans**: Get AI-generated daily task plans tailored to your goals
- **📱 Push Notifications**: Receive motivational reminders and task notifications
- **📊 Progress Tracking**: Visual progress tracking with streaks and completion rates
- **🌍 Multi-language Support**: Available in 18+ languages with RTL support
- **🌙 Dark Theme**: Beautiful technological dark theme with purple accents
- **🔐 Secure Authentication**: Powered by Supabase Auth

## 🛠 Tech Stack

### Frontend
- **React Native** with Expo SDK
- **TypeScript** for type safety
- **Zustand** for state management
- **react-i18next** for internationalization
- **Expo Notifications** for push notifications

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Row Level Security** for data protection
- **Edge Functions** for business logic
- **Cron Jobs** for automated notifications

### Design
- **Dark theme** with technological aesthetic
- **Purple accent colors** (#8B5CF6, #A855F7, #C084FC)
- **Gradient effects** and glowing elements
- **RTL layout support** for Arabic/Hebrew

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd genie
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Fill in your Supabase credentials in `.env`

4. **Set up Supabase**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Initialize Supabase
   supabase init
   
   # Start local development
   supabase start
   
   # Run migrations
   supabase db reset
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

### Running on Device

- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Web**: `npm run web`

## 📁 Project Structure

```
genie/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── primitives/      # Basic components (Button, Text, etc.)
│   │   ├── complex/         # Mid-level components
│   │   └── domain/          # App-specific components
│   ├── screens/             # Screen components
│   ├── features/            # Feature-based modules
│   ├── services/            # API and external services
│   ├── store/               # State management
│   ├── theme/               # Design system
│   ├── i18n/                # Internationalization
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── supabase/
│   ├── migrations/          # Database migrations
│   ├── functions/           # Edge functions
│   └── policies/            # RLS policies
└── assets/                  # Images, fonts, icons
```

## 🎨 Design System

### Colors
- **Background**: Deep blacks and dark grays
- **Primary**: Purple gradients (#8B5CF6 → #A855F7)
- **Accent**: Electric blue (#06B6D4) and neon green (#10B981)
- **Text**: White with secondary grays

### Typography
- **Font**: Inter (Regular, Medium, Bold)
- **Scales**: Responsive text sizing
- **RTL Support**: Right-to-left layout for Arabic/Hebrew

## 🌍 Internationalization

Supported languages:
- English, Spanish, French, German, Italian, Portuguese
- Russian, Chinese, Japanese, Korean
- Arabic, Hindi, Hebrew, Turkish, Polish, Dutch, Swedish, Danish

### Adding New Languages

1. Create translation file in `src/i18n/[locale].json`
2. Add language to `SUPPORTED_LANGUAGES` in `src/config/constants.ts`
3. Import in `src/i18n/index.ts`

## 🔧 Development

### Code Style
- ESLint + Prettier configuration
- TypeScript strict mode
- Consistent component structure

### Testing
```bash
npm test                 # Run unit tests
npm run test:e2e        # Run E2E tests
```

### Building
```bash
npm run build           # Build for production
eas build              # Build with EAS
```

## 📱 Features Roadmap

### Phase 1 ✅
- [x] Project setup and foundation
- [x] Authentication system
- [x] Basic UI components
- [x] Dark theme implementation
- [x] Internationalization setup

### Phase 2 🚧
- [ ] Goal creation and management
- [ ] Task generation system
- [ ] Progress tracking
- [ ] Push notifications

### Phase 3 📋
- [ ] Advanced analytics
- [ ] Social features
- [ ] Voice input
- [ ] AI-powered insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Join our community discussions

---

**Made with ❤️ and ✨ magic**
