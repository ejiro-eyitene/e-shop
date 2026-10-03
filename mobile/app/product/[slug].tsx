import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCart } from "../../context/CartContext";
import { API_URL, fetchProducts, type Product } from "../../lib/api";
import { naira } from "../../lib/format";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setError(null);
        const data = await fetchProducts({});
        const match = data.products.find((p) => p.slug === slug) ?? null;
        if (active) setProduct(match);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load this product.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  async function handleAdd() {
    if (!product) return;
    setBusy(true);
    try {
      await addItem({
        id: product.id,
        slug: product.slug,
        name: product.name,
        priceInKobo: product.priceInKobo,
        imageUrl: product.imageUrl,
        stock: product.stock,
      });
      setAdded(true);
      // Reset the confirmation so adding again re-shows it.
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // The cart context already surfaced the message.
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-100">
        <ActivityIndicator size="large" color="#570df8" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-100 px-6">
        <Text className="text-4xl">📦</Text>
        <Text className="mt-3 text-lg font-bold">
          {error ?? "Product not found"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-xl bg-primary px-6 py-3"
        >
          <Text className="font-semibold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const outOfStock = product.stock <= 0;

  return (
    <SafeAreaView className="flex-1 bg-base-100" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="h-56 w-full items-center justify-center bg-base-200">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-5xl">📦</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Pressable onPress={() => router.back()} className="mb-3 self-start">
          <Text className="text-sm text-primary">← Back</Text>
        </Pressable>

        <Text className="text-2xl font-bold">{product.name}</Text>

        <Text className="mt-1 self-start rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/70">
          {product.category}
        </Text>

        <Text className="mt-3 text-2xl font-bold text-primary">
          {naira(product.priceInKobo)}
        </Text>

        <Text className="mt-1 text-sm text-base-content/60">
          {outOfStock
            ? "Out of stock"
            : `${product.stock} available`}
        </Text>

        {product.description ? (
          <Text className="mt-4 leading-6 text-base-content/80">
            {product.description}
          </Text>
        ) : null}

        <Pressable
          disabled={outOfStock || busy}
          onPress={handleAdd}
          className="mt-6 items-center rounded-xl bg-primary py-4 disabled:opacity-50"
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-semibold text-white">
              {outOfStock
                ? "Out of stock"
                : added
                  ? "✓ Added to cart"
                  : "Add to cart"}
            </Text>
          )}
        </Pressable>

        <Text className="mt-3 text-center text-xs text-base-content/50">
          Prices and stock are live from {new URL(API_URL).host}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
