import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Stack } from './lib/nav';
import { useTheme } from './lib/theme';
import { HomeScreen } from './screens/HomeScreen';
import { NoteScreen } from './screens/NoteScreen';

export default function App() {
  const t = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <Stack
            background={t.bg}
            render={(route) => (route.name === 'Home' ? <HomeScreen /> : <NoteScreen key={route.id} />)}
          />
          <StatusBar style="auto" />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
