import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, fetchOrders, type Order } from "../../lib/api";
import { naira } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";

/** Colour treatment per order state, matching the web table badges. */
function statusClass(status: Order["status"]) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-base-200 text-base-content/70";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default function OrdersScreen() {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await fetchOrders(token);
      setOrders(data.orders);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load your orders.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!token) {
      // Guests have no server-side order history, so send them to sign in
      // rather than showing an empty list that looks like data loss.
      router.replace("/(tabs)/account");
      return;
    }
    void load();
  }, [token, authLoading, load, router]);

  if (loading || authLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-200">
        <ActivityIndicator size="large" color="#570df8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base-200" edges={["top"]}>
      <View className="bg-base-100 px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold">My Orders</Text>
        <Text className="mt-0.5 text-sm text-base-content/60">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor="#570df8"
          />
        }
      >
        {error ? (
          <View className="mb-3 rounded-xl bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
            <Pressable onPress={() => void load()} className="mt-2">
              <Text className="text-sm font-semibold text-red-700">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {orders.length === 0 && !error ? (
          <View className="items-center py-16">
            <Text className="text-5xl">📦</Text>
            <Text className="mt-4 text-lg font-bold">No orders yet</Text>
            <Text className="mt-1 text-sm text-base-content/60">
              When you place an order it will appear here.
            </Text>
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              className="mt-6 rounded-xl bg-primary px-6 py-3"
            >
              <Text className="font-semibold text-white">Start shopping</Text>
            </Pressable>
          </View>
        ) : null}

        {orders.map((order) => (
          <View
            key={order.id}
            className="mb-3 rounded-2xl border border-base-300 bg-base-100 p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold">Order #{order.id}</Text>
              <Text
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(order.status)}`}
              >
                {order.status}
              </Text>
            </View>

            <Text className="mt-1 text-xs text-base-content/50">
              {new Date(order.createdAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>

            <View className="mt-3 gap-1">
              {order.items.map((item) => (
                <View
                  key={`${order.id}-${item.name}`}
                  className="flex-row justify-between text-sm"
                >
                  <Text className="flex-1 pr-2 text-base-content/80">
                    {item.name} × {item.quantity}
                  </Text>
                  <Text>{naira(item.lineTotalInKobo)}</Text>
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row justify-between border-t border-base-200 pt-3">
              <Text className="font-bold">Total</Text>
              <Text className="font-bold text-primary">
                {naira(order.totalInKobo)}
              </Text>
            </View>

            {order.reference ? (
              <Text className="mt-2 font-mono text-[10px] text-base-content/40">
                {order.reference}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}