NeFo local notifications — Android closed-app scheduled reminders

Files included:
- src/App.jsx
- src/pages/Checkout.jsx
- src/lib/nefoLocalNotifications.js
- src/components/LocalNotificationBootstrap.jsx

1. Copy the included src folder into:
   C:\Users\Admin\Desktop\App

2. Install the matching Capacitor plugin from the project root:

   $capVersion = node -p "require('./node_modules/@capacitor/core/package.json').version"
   npm install "@capacitor/local-notifications@$capVersion"

3. In android\app\src\main\AndroidManifest.xml, add this above <application>:

   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

4. Rebuild:

   npm run build
   npx cap sync android

   cd android
   .\gradlew clean
   .\gradlew assembleDebug

What this package does:
- Schedules a customer reminder 30 minutes before a scheduled order.
- Schedules another reminder at the selected order time.
- The reminders are registered with Android and can appear after NeFo is closed.
- Tapping a reminder opens the NeFo Orders page.

Important limitation:
These are time-based local reminders. New-order alerts, seller acceptance,
ready-for-pickup changes, and chat messages while the app is closed require
Firebase Cloud Messaging push notifications.
