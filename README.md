# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

### Firebase Phone Auth (Expo)

This project uses the Firebase JS SDK for Authentication in the Expo managed workflow. To enable phone-number sign-in with reCAPTCHA, install the Expo helper and follow the steps below.

1. Install the reCAPTCHA helper:

```bash
expo install expo-firebase-recaptcha
```

2. Make sure your Firebase config is set in `src/firebase/config.js` (or via env vars).

3. In `src/screens/LoginScreen.js` we use `FirebaseRecaptchaVerifierModal` from `expo-firebase-recaptcha` and the Firebase JS `signInWithPhoneNumber` flow. On web the reCAPTCHA will be shown automatically; on native Expo this modal provides a reCAPTCHA flow.

4. Run the app and test phone auth (use a real device or a simulator with network access):

```bash
npx expo start
```

Notes:
- If you prefer a native implementation, use `@react-native-firebase/auth` with a development or production build.
- The demo `LoginScreen` and `src/services/authService.js` include example calls to `sendPhoneVerification`, `confirmVerificationCode`, and `ensureUserDoc`.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
