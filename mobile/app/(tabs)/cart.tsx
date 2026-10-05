import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { naira } from "../../lib/format";
import type { CartLine } from "../../lib/api";

export default function CartScreen() {
  const { items, count, subtotalInKobo, loading, error, setQuantity, removeItem } =
    useCart();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function change(line: CartLine, delta: number) {
    setBusy(true);
    await setQuantity(line.productId, line.quantity + delta);
    setBusy(false);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-200">
        <ActivityIndicator size="large" color="#570df8" />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-200">
        <Text className="text-5xl">🛒</Text>
        <Text className="mt-4 text-xl font-bold">Your cart is empty</Text>
        <Text className="mt-1 text-sm text-base-content/60">
          Browse the catalogue and add something you like.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base-200" edges={["top"]}>
      <View className="bg-base-100 px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold">Your Cart</Text>
        <Text className="mt-0.5 text-sm text-base-content/60">
          {count} item{count === 1 ? "" : "s"}
          {user ? "" : " · saved on this device"}
        </Text>
      </View>

      {error ? (
        <View className="mx-4 mt-3 rounded-xl bg-red-50 p-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.productId)}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <View className="mb-3 flex-row items-center rounded-2xl border border-base-300 bg-base-100 p-3">
            <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-base-200">
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-xl">📦</Text>
              )}
            </View>

            <View className="ml-3 flex-1">
              <Text numberOfLines={2} className="font-semibold">
                {item.name}
              </Text>
              <Text className="mt-0.5 text-xs text-base-content/60">
                {naira(item.priceInKobo)} each
              </Text>

              <View className="mt-2 flex-row items-center">
                <Pressable
                  disabled={busy}
                  onPress={() => change(item, -1)}
                  className="h-8 w-8 items-center justify-center rounded-lg border border-base-300"
                  accessibilityLabel={`Decrease quantity of ${item.name}`}
                >
                  <Text className="text-base">−</Text>
                </Pressable>

                <Text className="mx-3 min-w-[24px] text-center font-semibold">
                  {item.quantity}
                </Text>

                <Pressable
                  disabled={busy || item.quantity >= item.stock}
                  onPress={() => change(item, 1)}
                  className="h-8 w-8 items-center justify-center rounded-lg border border-base-300 disabled:opacity-40"
                  accessibilityLabel={`Increase quantity of ${item.name}`}
                >
                  <Text className="text-base">+</Text>
                </Pressable>
              </View>
            </View>

            <View className="items-end">
              <Text className="font-bold">{naira(item.lineTotalInKobo)}</Text>
              <Pressable
                onPress={() => removeItem(item.productId)}
                className="mt-2"
                accessibilityLabel={`Remove ${item.name}`}
              >
                <Text className="text-xs text-red-600">Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <View className="border-t border-base-300 bg-base-100 p-4">
        <View className="mb-1 flex justify-between text-sm">
          <Text className="text-base-content/70">Subtotal</Text>
          <Text>{naira(subtotalInKobo)}</Text>
        </View>
        <View className="mb-3 flex justify-between text-sm">
          <Text className="text-base-content/70">Delivery</Text>
          <Text>From ₦1,500.00</Text>
        </View>
        <View className="flex justify-between text-lg font-bold">
          <Text>Total</Text>
          <Text className="text-primary">
            {naira(subtotalInKobo + 150000)}
          </Text>
        </View>

        <Pressable
          disabled={busy || items.length === 0}
          onPress={() => router.push("/checkout")}
          className="mt-4 items-center rounded-xl bg-primary py-3 disabled:opacity-60"
        >
          <Text className="font-semibold text-white">Proceed to checkout</Text>
        </Pressable>

        {!user ? (
          <Text className="mt-2 text-center text-xs text-base-content/50">
            Sign in to sync this cart across your devices.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
