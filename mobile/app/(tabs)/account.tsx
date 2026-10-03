import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

export default function AccountScreen() {
  const { user, loading, signingIn, signIn, signOut, error } = useAuth();
  const { count, clearLocalCart } = useCart();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-200">
        <ActivityIndicator size="large" color="#570df8" />
      </SafeAreaView>
    );
  }

  if (user) {
    const initials = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

    return (
      <SafeAreaView className="flex-1 bg-base-200" edges={["top"]}>
        <View className="bg-base-100 px-4 pb-6 pt-4">
          <Text className="text-2xl font-bold">Account</Text>

          <View className="mt-5 flex-row items-center">
            {user.image ? (
              <Image
                source={{ uri: user.image }}
                className="h-14 w-14 rounded-full"
              />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
                <Text className="text-xl font-bold text-white">{initials}</Text>
              </View>
            )}

            <View className="ml-3 flex-1">
              <Text className="font-semibold">{user.name ?? "Shopper"}</Text>
              {user.email ? (
                <Text className="text-sm text-base-content/60">
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View className="p-4">
          <View className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <Text className="text-sm text-base-content/60">Items in cart</Text>
            <Text className="mt-1 text-2xl font-bold">{count}</Text>
            <Text className="mt-2 text-xs text-base-content/50">
              Your cart is synced to your account across devices.
            </Text>
          </View>

          <Pressable
            onPress={() => void signOut()}
            className="mt-4 items-center rounded-xl border border-red-200 bg-red-50 py-3"
          >
            <Text className="font-semibold text-red-700">Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base-200" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold">Account</Text>
        <Text className="mt-6 text-center text-base-content/60">
          Sign in to track orders and keep your cart synced.
        </Text>

        <Pressable
          disabled={signingIn}
          onPress={() => void signIn()}
          className="mt-6 w-full items-center rounded-xl bg-white px-4 py-3 shadow disabled:opacity-60"
          accessibilityLabel="Continue with Google"
        >
          {signingIn ? (
            <ActivityIndicator color="#570df8" />
          ) : (
            <Text className="font-semibold text-base-content">
              Continue with Google
            </Text>
          )}
        </Pressable>

        {error ? (
          <Text className="mt-3 text-center text-sm text-red-600">{error}</Text>
        ) : null}

        <View className="mt-8 rounded-2xl border border-base-300 bg-base-100 p-4">
          <Text className="text-sm font-semibold">Shopping as a guest</Text>
          <Text className="mt-1 text-xs text-base-content/60">
            You can keep browsing and building a cart. It is saved on this
            device and merges into your account when you sign in.
          </Text>
          <Pressable onPress={() => void clearLocalCart()} className="mt-3">
            <Text className="text-xs font-medium text-red-600">
              Clear guest cart
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
