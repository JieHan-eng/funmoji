import "./global.css";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RecentStickersProvider } from "./context/RecentStickersContext";
import { HomeScreen } from "./screens/HomeScreen";
import { GeneratorScreen } from "./screens/GeneratorScreen";
import { PreviewScreen } from "./screens/PreviewScreen";
import type { RootStackParamList } from "./types/navigation";

const Stack = createStackNavigator<RootStackParamList>();

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#c084fc",
    background: "#0f0618",
    card: "#0f0618",
    text: "#fff",
    border: "#4c1d95",
    notification: "#a855f7",
  },
};

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <RecentStickersProvider>
      <NavigationContainer theme={AppTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#0f0618" },
            headerTintColor: "#c084fc",
            headerTitleStyle: { fontWeight: "600" },
            cardStyle: { backgroundColor: "#0f0618" },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Generator"
            component={GeneratorScreen}
            options={{ title: "Create Sticker" }}
          />
          <Stack.Screen
            name="Preview"
            component={PreviewScreen}
            options={{ title: "Your Sticker" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </RecentStickersProvider>
    </>
  );
}
