import { Link, Tabs } from "expo-router";
import { Text, View } from "react-native";

import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

/** Tiny badge showing the cart count, mirroring the web navbar indicator. */
function CartBadge() {
  const { count } = useCart();
  if (count <= 0) return null;

  return (
    <View className="absolute -right-2 -top-1 min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
      <Text className="text-[10px] font-bold text-white">{count}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#570df8",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shop",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛍️</Text>,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: () => (
            <View>
              <Text style={{ fontSize: 20 }}>🛒</Text>
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: () => (
            <Text style={{ fontSize: 20 }}>{user ? "👤" : "🔑"}</Text>
          ),
        }}
      />
    </Tabs>
  );
}
