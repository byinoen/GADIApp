import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import { Stack } from 'expo-router';

export default function AuthNavigator() {
  const { user } = useAuth();

  // Show LoginScreen if user is not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show the normal stack navigation for authenticated users
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}