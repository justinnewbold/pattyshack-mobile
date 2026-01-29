# Patty Shack Mobile App

A React Native/Expo mobile application for Patty Shack restaurant operations management.

![Patty Shack Logo](https://img.shields.io/badge/Patty%20Shack-Operations%20App-4CAF50?style=for-the-badge)

## Features

### 📋 Task Management
- **Opening Checklists** - Daily opening procedures with subtask tracking
- **Closing Checklists** - End-of-day cleanup and closing tasks
- **Progress Tracking** - Visual progress bars and completion status
- **Digital Signatures** - Accountability for completed tasks

### 📅 Shift Management
- View weekly shift schedules
- Track hours worked
- Location assignments
- Days off visibility

### 💬 Messaging
- Internal team communication
- Corporate announcements
- Shift lead notifications
- Unread message badges

### 📊 Dashboard
- Quick stats overview (pending tasks, compliance %)
- Temperature log tracking
- Quick action buttons
- Today's task summary

### 👤 User Profile
- Employee information
- Location assignment
- Role-based access
- Settings and preferences

## Tech Stack

- **Framework**: React Native + Expo (SDK 52)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL)
- **UI Components**: Custom components with Expo Vector Icons
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for emulator)
- Expo Go app on your phone (for physical device testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/justinnewbold/pattyshack-mobile.git
   cd pattyshack-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
pattyshack-mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── shifts.tsx     # Shifts schedule
│   │   ├── tasks.tsx      # Tasks list
│   │   ├── messages.tsx   # Messages
│   │   ├── more.tsx       # Profile & settings
│   │   └── _layout.tsx    # Tab navigation config
│   ├── task/
│   │   └── [id].tsx       # Task detail screen
│   ├── auth/
│   │   └── login.tsx      # Login screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ui/               # UI primitives
│   ├── tasks/            # Task-related components
│   └── dashboard/        # Dashboard components
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── store.ts          # Zustand store
├── constants/
│   └── Colors.ts         # Design tokens
├── types/
│   └── index.ts          # TypeScript types
├── app.json              # Expo configuration
└── package.json
```

## Database Schema

The app integrates with Supabase tables:

- `users` - Employee profiles
- `locations` - Restaurant locations
- `tasks` - Checklist templates
- `subtasks` - Individual checklist items
- `task_completions` - Completed task records
- `temperature_logs` - HACCP temperature recordings
- `messages` - Internal communications
- `shifts` - Employee shift schedules

## Locations

- Taylorsville, UT
- Salt Lake City, UT
- Layton, UT
- Denver, CO

## Scripts

```bash
# Start development server
npm start

# Start with cache cleared
npm run start -- --clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## Deployment

### Expo Application Services (EAS)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configure EAS:
   ```bash
   eas build:configure
   ```

3. Build for iOS:
   ```bash
   eas build --platform ios
   ```

4. Build for Android:
   ```bash
   eas build --platform android
   ```

5. Submit to app stores:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

Private - Patty Shack Internal Use Only

## Support

For technical support, contact the development team or create an issue in this repository.

---

Built with ❤️ for Patty Shack Operations
