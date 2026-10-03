import { Link } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import type { Product } from "../lib/api";
import { naira } from "../lib/format";

type Props = {
  product: Product;
  /** Highlights the product currently being viewed. */
  compact?: boolean;
};

/**
 * Catalogue card, styled to match the web storefront's daisyUI card so the two
 * surfaces read as the same product.
 */
export function ProductCard({ product, compact = false }: Props) {
  return (
    <Link href={`/product/${product.slug}`} asChild>
      <Pressable
        testID={`product-${product.slug}`}
        className="mb-3 overflow-hidden rounded-2xl border border-base-300 bg-base-100"
      >
        <View className="h-40 w-full items-center justify-center bg-base-200">
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
              accessibilityLabel={product.name}
            />
          ) : (
            <Text className="text-3xl">📦</Text>
          )}
        </View>

        <View className="p-3">
          <Text numberOfLines={2} className="font-semibold text-base-content">
            {product.name}
          </Text>

          {!compact && product.category ? (
            <Text className="mt-1 self-start rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/70">
              {product.category}
            </Text>
          ) : null}

          <Text className="mt-2 text-lg font-bold text-primary">
            {naira(product.priceInKobo)}
          </Text>

          {product.stock <= 0 ? (
            <Text className="mt-1 text-xs font-medium text-red-600">
              Out of stock
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
