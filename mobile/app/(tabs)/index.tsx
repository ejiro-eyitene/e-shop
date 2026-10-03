import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductCard } from "../../components/ProductCard";
import { fetchProducts, type Product } from "../../lib/api";

export default function ShopScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchProducts({
        category,
        q: search.trim() || undefined,
      });
      setProducts(data.products);
      setCategories(data.categories);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load products.",
      );
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  return (
    <SafeAreaView className="flex-1 bg-base-200" edges={["top"]}>
      <View className="bg-base-100 px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold">🛍️ e-shop</Text>
        <Text className="mt-0.5 text-sm text-base-content/60">
          Everything you need, delivered
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products…"
          placeholderTextColor="#9ca3af"
          className="mt-3 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-base-content"
          returnKeyType="search"
        />
      </View>

      <View className="mt-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="py-2"
        >
          {["All", ...categories].map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  active
                    ? "border-primary bg-primary"
                    : "border-base-300 bg-base-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    active ? "text-white" : "text-base-content/70"
                  }`}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View className="mx-4 rounded-xl bg-red-50 p-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#570df8" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl">🔍</Text>
              <Text className="mt-3 font-semibold">No products found</Text>
              <Text className="mt-1 text-sm text-base-content/60">
                Try a different search or category.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
