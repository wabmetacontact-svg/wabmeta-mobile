# wabmeta-mobile

WABMeta Mobile App built with React Native and Expo (SDK 57).

## Features

- WhatsApp Business Cloud API Integration
- Multi-channel Inbox & Real-time Live Chat (Socket.IO)
- AI Auto-Reply & Assistant
- Broadcasts, Templates & Campaign Management
- Contacts & Tags Management
- Analytics & Reports
- Webhook & Push Notifications support

## Tech Stack

- **Framework**: React Native with Expo SDK 57 (Expo Router)
- **State & Storage**: AsyncStorage & SecureStore
- **Networking**: Axios & Socket.IO Client
- **UI & Icons**: React Native Vector Icons, Lucide Icons, Linear Gradient

## Getting Started

### 1. Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo Go app on iOS / Android or Emulator

### 2. Installation

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### 4. Running the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```
