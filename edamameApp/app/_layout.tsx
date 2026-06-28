import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      
      {/* WELCOME PAGE */}
      <Stack.Screen name="index" />

      {/* AUTH */}
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />

      {/* DASHBOARD */}
      <Stack.Screen name="(tabs)" />

    </Stack>
  );
}