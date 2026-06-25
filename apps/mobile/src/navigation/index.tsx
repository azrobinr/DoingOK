import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ContactDetailScreen from '../screens/ContactDetailScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { AuthStackParamList, ContactsStackParamList, AppTabParamList, SettingsStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ContactsStack = createNativeStackNavigator<ContactsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function ContactsNavigator() {
  return (
    <ContactsStack.Navigator>
      <ContactsStack.Screen
        name="ContactsList"
        component={ContactsScreen}
        options={{ title: 'Trusted Contacts' }}
      />
      <ContactsStack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={({ route }) =>
          ({ title: route.params?.contactId ? 'Edit Contact' : 'Add Contact' })
        }
      />
    </ContactsStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsRoot"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <SettingsStack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Check-in Schedule' }}
      />
    </SettingsStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: { fontSize: 13 },
        tabBarActiveTintColor: '#1a73e8',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, tabBarLabel: 'Check In', tabBarIcon: () => <Text>🏠</Text> }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsNavigator}
        options={{ headerShown: false, tabBarLabel: 'Contacts', tabBarIcon: () => <Text>👥</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ headerShown: false, tabBarLabel: 'Settings', tabBarIcon: () => <Text>⚙️</Text> }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
