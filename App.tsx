import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "@expo-google-fonts/dm-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { RootNavigator } from "@/navigation/RootNavigator";
import { injectWebStyles } from "@/theme/injectWebStyles";

// A single shared QueryClient. Sensible offline-friendly defaults: keep
// showing cached data on failure, retry quietly in the background rather than
// flashing error screens for transient network blips.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnReconnect: true,
    },
  },
});

import { AlertProvider } from "@/context/AlertContext";

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular: require("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"),
  });

  useEffect(() => {
    injectWebStyles();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AlertProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AlertProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
