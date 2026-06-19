# LegalAI Mobile Application

A premium, dark-mode-only React Native mobile application for legal AI analysis, offering automated case evaluation, document detail review, retrieval debugging, litigation strategy formulation, and AI benchmarking.

---

## 🌟 Key Screens & Features

- **Home Screen**: Overview of active legal cases, status indicators, and quick shortcuts.
- **Documents Screen**: Document vault displaying uploaded briefs, petitions, and evidence with interactive preview capabilities.
- **Chat Assistant**: Real-time interactive AI chat for consulting legal models and drafts.
- **Litigation Strategy**: Visual mapping of legal arguments, timeline charts, and perspective comparison grids.
- **Risk Report**: Interactive analytics detailing litigation risk factors, confidence scores, and recommendations.
- **Benchmark Screen**: Comparative testing framework evaluating AI retrieval accuracy across various benchmark legal datasets.

---

## 📁 Repository Structure

```
LegalAI/
├── android/                 # Native Android build folder
├── ios/                     # Native iOS build folder
├── src/                     # Source code directory
│   ├── components/          # Reusable UI components
│   ├── evaluation/          # Retrieval evaluation engines & benchmarks
│   ├── navigation/          # React Navigation stacks (AppNavigator.jsx)
│   ├── screens/             # Screen components (13 distinct views)
│   ├── services/            # API integration & local store configurations
│   ├── store/               # State management (Zustand/Redux)
│   └── utils/               # Formatting, date helpers, and constants
│
├── App.jsx                  # Root entry point configuring SafeArea and StatusBar
├── index.js                 # App registration
├── package.json
└── metro.config.js          # Metro bundler config
```

---

## 🧰 Tech Stack

- **Framework**: React Native (CLI bootstrap)
- **Navigation**: React Navigation (Stack)
- **Safe Area Management**: react-native-safe-area-context
- **Design System**: Custom Dark Navy Theme styling
- **Runtime Env**: tested on Node.js v24.12.0

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+, tested on v24.12.0)
- Android SDK / Android Studio (for Android build)
- Xcode & CocoaPods (for iOS build - macOS only)

### Installation

1. Navigate to the project root:
   ```bash
   cd mobile-legal-ai-assistant/LegalAI
   ```
2. Install JS dependencies:
   ```bash
   npm install
   ```

### Running the App

#### Step 1: Start Metro
Start the Metro bundler to handle real-time JS code bundling:
```bash
npm start
```

#### Step 2: Build & Run

- **Android**:
  ```bash
  npm run android
  ```
- **iOS** (macOS required):
  1. Install CocoaPods:
     ```bash
     cd ios && pod install && cd ..
     ```
  2. Run the simulator:
     ```bash
     npm run ios
     ```
