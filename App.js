import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View, StyleSheet, TouchableOpacity, I18nManager, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AttendanceScreen from './screens/AttendanceScreen';
import ClientsScreen from './screens/ClientsScreen';
import ClientDetailScreen from './screens/ClientDetailScreen';
import DashboardScreen from './screens/DashboardScreen';
import DashboardDrillDownScreen from './screens/DashboardDrillDownScreen';
import RequestsScreen from './screens/RequestsScreen';
import SettingsScreen from './screens/SettingsScreen';
import HeaderGradient from './components/HeaderGradient';

const RootStack = createNativeStackNavigator();

const DRILL_TITLES = {
  absent: 'נעדרים השבוע',
  weekly: 'נוכחות השבוע',
  unpaid: 'טרם שלמו',
  reminders: 'התראה לפני סיום כרטיסיה',
};

I18nManager.forceRTL(true);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PURPLE = '#6B3FA0';
const TAB_BG = '#FFFFFF';

function ClientsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderGradient />,
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="ClientsList" component={ClientsScreen} options={{ title: 'לקוחות' }} />
      <Stack.Screen
        name="ClientDetail"
        component={ClientDetailScreen}
        options={({ navigation }) => ({
          title: 'כרטיס לקוח',
          // Always render our own back button rather than conditionally
          // deferring to the native default — passing headerLeft: undefined
          // when canGoBack() is true does NOT fall back to native-stack's
          // default back arrow, it suppresses it entirely. Deciding
          // goBack() vs. a fallback destination at press time sidesteps
          // that, and also covers the case where entering from Attendance/
          // Dashboard skips ClientsList, leaving no "back" history at all.
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClientsList')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderGradient />,
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'דשבורד' }} />
      <Stack.Screen
        name="DashboardDrillDown"
        component={DashboardDrillDownScreen}
        options={({ route }) => ({ title: DRILL_TITLES[route.params?.type] ?? '' })}
      />
    </Stack.Navigator>
  );
}

function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Attendance: 'calendar-outline',
            Clients: 'people-outline',
            Dashboard: 'stats-chart-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: TAB_BG, borderTopColor: '#E5E5E5' },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderGradient />,
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: 'נוכחות',
          headerTitle: 'דרך הגוף',
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsStack}
        options={{ title: 'לקוחות', headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Clients', { screen: 'ClientsList' });
          },
        })}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{ title: 'דשבורד', headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Dashboard', { screen: 'DashboardHome' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  // Only show the decorative phone-frame on genuinely wide (desktop) browsers.
  // On a real phone the app should fill the actual viewport.
  const showFrame = isWeb && width > 480;

  const content = (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: 'transparent' },
          headerBackground: () => <HeaderGradient />,
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      >
        <RootStack.Screen name="Tabs" component={RootTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
        <RootStack.Screen name="Requests" component={RequestsScreen} options={{ title: 'בקשות' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );

  if (!showFrame) {
    // position:fixed (instead of height:100vh) sidesteps mobile Safari's dynamic
    // toolbar resizing the visual viewport, which was pushing the header/tab
    // bar out of view.
    return <SafeAreaProvider style={styles.mobileWeb}>{content}</SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.webOuter}>
        <View style={[styles.webFrame, { boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }]}>
          {content}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mobileWeb: Platform.select({
    web: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 },
    default: { flex: 1 },
  }),
  webOuter: {
    flex: 1,
    minHeight: '100vh',
    backgroundColor: '#4A2575',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFrame: {
    width: 390,
    height: 844,
    overflow: 'hidden',
    borderRadius: 40,
  },
});
