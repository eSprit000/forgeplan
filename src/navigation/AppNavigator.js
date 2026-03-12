import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { COLORS } from '../constants/theme';
import { LanguageProvider } from '../i18n/LanguageContext';
import { AuthProvider, useAuth } from './AuthProvider';

// Auth
import LoginScreen from '../screens/LoginScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Coach
import AddAthleteScreen from '../screens/coach/AddAthleteScreen';
import AthleteDetailScreen from '../screens/coach/AthleteDetailScreen';
import CoachDashboardScreen from '../screens/coach/CoachDashboardScreen';
import CreateProgramScreen from '../screens/coach/CreateProgramScreen';
import NutritionProgramScreen from '../screens/coach/NutritionProgramScreen';

// Athlete
import AthleteCodeEntryScreen from '../screens/athlete/AthleteCodeEntryScreen';
import AthleteWorkoutScreen from '../screens/athlete/AthleteWorkoutScreen';

const Stack = createNativeStackNavigator();

/* ─── Root navigator switches based on auth state ─────────── */
const Navigator = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>

        {/* ── Not logged in ── */}
        {!user && (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}

        {/* ── Logged in, no role yet ── */}
        {user && !user.rol && (
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        )}

        {/* ── Coach flow ── */}
        {user?.rol === 'koc' && (
          <Stack.Group>
            <Stack.Screen name="CoachDashboard" component={CoachDashboardScreen} />
            <Stack.Screen name="AddAthlete" component={AddAthleteScreen} />
            <Stack.Screen name="AthleteDetail" component={AthleteDetailScreen} />
            <Stack.Screen name="CreateProgram" component={CreateProgramScreen} />
            <Stack.Screen name="CreateNutrition" component={NutritionProgramScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Group>
        )}

        {/* ── Athlete: no code yet ── */}
        {user?.rol === 'sporcu' && !user?.sporcuId && (
          <Stack.Screen name="AthleteCodeEntry" component={AthleteCodeEntryScreen} />
        )}

        {/* ── Athlete: has program ── */}
        {user?.rol === 'sporcu' && user?.sporcuId && (
          <Stack.Group>
            <Stack.Screen name="AthleteWorkout" component={AthleteWorkoutScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Group>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AppNavigator = () => (
  <LanguageProvider>
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  </LanguageProvider>
);

export default AppNavigator;
