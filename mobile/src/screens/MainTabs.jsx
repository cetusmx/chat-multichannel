import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, MessageCircle, Users, LogOut } from 'lucide-react-native';
import useAuthStore from '@shared/stores/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import ChatListScreen from './ChatListScreen';
import DashboardScreen from './DashboardScreen';
import ClientesScreen from './ClientesScreen';
import { View, Platform } from 'react-native';

const Tab = createBottomTabNavigator();

const LogoutDummy = () => <View />;

export default function MainTabs() {
  const logout = useAuthStore(s => s.logout);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Conversaciones"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#0f172a',
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          height: 65 + insets.bottom,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
        }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Conversaciones" 
        component={ChatListScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Clientes" 
        component={ClientesScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Salir" 
        component={LogoutDummy} 
        options={{
          tabBarIcon: ({ color, size }) => <LogOut color={color} size={size} />
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            logout();
          },
        }}
      />
    </Tab.Navigator>
  );
}
