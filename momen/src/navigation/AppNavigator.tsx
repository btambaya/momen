/**
 * Momen — App Navigator
 *
 * Stack navigation with glassmorphism-consistent dark headers.
 * Dark theme eliminates white flash between screen transitions.
 */

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { SessionsListScreen } from '../screens/SessionsListScreen';
import { CreateSessionScreen } from '../screens/CreateSessionScreen';
import { SyncScreen } from '../screens/SyncScreen';
import { LoggingScreen } from '../screens/LoggingScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Dark theme to prevent white flash between screen transitions
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.coral.main,
    background: colors.bg.primary,
    card: colors.bg.primary,
    text: colors.text.primary,
    border: colors.glass.border,
    notification: colors.coral.main,
  },
};

export function AppNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        initialRouteName="SessionsList"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
          animation: 'fade',
          navigationBarColor: colors.bg.primary,
          statusBarBackgroundColor: colors.bg.primary,
          statusBarStyle: 'light',
        }}
      >
        <Stack.Screen name="SessionsList" component={SessionsListScreen} />
        <Stack.Screen name="CreateSession" component={CreateSessionScreen} />
        <Stack.Screen name="Sync" component={SyncScreen} />
        <Stack.Screen name="Logging" component={LoggingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
