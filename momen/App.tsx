/**
 * Momen — App Entry Point
 *
 * Initialises the database and renders the navigator.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getDatabase } from './src/database/db';
import { colors, fonts, fontSize } from './src/theme';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
        setIsReady(true);
      } catch (err: any) {
        setError(err.message || 'Failed to initialise database');
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <View style={styles.splash}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>MOMEN</Text>
        <ActivityIndicator color={colors.coral.main} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: fonts.mono,
    fontSize: fontSize['3xl'],
    fontWeight: '300',
    color: colors.text.primary,
    letterSpacing: 8,
  },
  errorText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
