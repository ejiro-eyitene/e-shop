import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError, createOrder } from "../lib/api";
import {
  DELIVERY_OPTIONS,
  NIGERIAN_STATES,
  PAYMENT_OPTIONS,
  deliveryFee,
  type DeliveryTypeId,
  type PaymentTypeId,
} from "../lib/shipping";
import { naira } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

/** Shared styling for the form controls so every field matches. */
const inputCls =
  "mt-1 rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-base text-base-content";
const labelCls = "text-sm font-semibold text-base-content";

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { items, subtotalInKobo, clear } = useCart();

  const [email, setEmail] = useState(user?.email ?? "");
  const [customerName, setCustomerName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeId>("standard");
  const [paymentType, setPaymentType] = useState<PaymentTypeId>("card");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = deliveryFee(deliveryType);
  const total = subtotalInKobo + fee;

  const canSubmit = useMemo(
    () =>
      items.length > 0 &&
      email.includes("@") &&
      customerName.trim().length > 0 &&
      phone.trim().length > 0 &&
      state !== null &&
      city.trim().length > 0 &&
      address.trim().length > 0,
    [items.length, email, customerName, phone, state, city, address],
  );

  /** Steps through the Nigerian states in order, wrapping at both ends. */
  function cycleState(direction: 1 | -1) {
    setState((prev) => {
      if (prev === null) {
        // Start at the top for forward, bottom for backward.
        return direction === 1 ? NIGERIAN_STATES[0] : NIGERIAN_STATES[NIGERIAN_STATES.length - 1];
      }
      const index = NIGERIAN_STATES.indexOf(prev);
      const next =
        (index + direction + NIGERIAN_STATES.length) % NIGERIAN_STATES.length;
      return NIGERIAN_STATES[next];
    });
  }

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await createOrder(
        {
          email: email.trim(),
          customerName: customerName.trim(),
          phone: phone.trim(),
          state: state!,
          city: city.trim(),
          shippingAddress: address.trim(),
          deliveryNotes: deliveryNotes.trim(),
          deliveryType,
          paymentType,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
        token,
      );

      // Clear only once the order exists server-side, so a failed payment
      // redirect never leaves the shopper with an empty cart.
      clear();
      await WebBrowser.openBrowserAsync(result.authorizationUrl);
      router.replace("/(tabs)/orders");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not start the payment. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base-200 px-6">
        <Text className="text-4xl">🛒</Text>
        <Text className="mt-3 text-lg font-bold">Nothing to check out</Text>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          className="mt-6 rounded-xl bg-primary px-6 py-3"
        >
          <Text className="font-semibold text-white">Browse products</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base-200" edges={["top"]}>
      <View className="flex-row items-center gap-3 bg-base-100 px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="text-2xl text-base-content/70">‹</Text>
        </Pressable>
        <Text className="text-lg font-bold">Checkout</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <Text className="mb-3 font-bold">Contact information</Text>
          <Text className={labelCls}>Email address</Text>
          <TextInput
            className={inputCls}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
          />
          <Text className={`${labelCls} mt-3`}>Full name</Text>
          <TextInput
            className={inputCls}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Ada Lovelace"
            placeholderTextColor="#9ca3af"
          />
          <Text className={`${labelCls} mt-3`}>Phone number</Text>
          <TextInput
            className={inputCls}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="0803 123 4567"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4">
          <Text className="mb-3 font-bold">Delivery address</Text>

          <Text className={labelCls}>State</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text
              className="flex-1 rounded-xl border border-base-300 bg-base-100 px-3 py-3 text-base"
            >
              {state ?? "Select a state"}
            </Text>
            <Pressable
              onPress={() => cycleState(1)}
              className="rounded-xl border border-base-300 px-4 py-3"
            >
              <Text className="text-base">▼</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => cycleState(-1)} className="mt-2 self-start">
            <Text className="text-xs text-primary">Previous state</Text>
          </Pressable>

          <Text className={`${labelCls} mt-3`}>City</Text>
          <TextInput
            className={inputCls}
            value={city}
            onChangeText={setCity}
            placeholder="Ikeja"
            placeholderTextColor="#9ca3af"
          />

          <Text className={`${labelCls} mt-3`}>Street address</Text>
          <TextInput
            className={`${inputCls} min-h-[80px]`}
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="12 Allen Avenue, Ikeja"
            placeholderTextColor="#9ca3af"
          />

          <Text className={`${labelCls} mt-3`}>
            Delivery notes (optional)
          </Text>
          <TextInput
            className={inputCls}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            placeholder="Gate colour, landmark…"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4">
          <Text className="mb-3 font-bold">Delivery method</Text>
          {DELIVERY_OPTIONS.map((option) => {
            const active = option.id === deliveryType;
            return (
              <Pressable
                key={option.id}
                onPress={() => setDeliveryType(option.id)}
                className={`mb-2 flex-row items-center rounded-xl border p-3 ${
                  active ? "border-primary bg-primary/5" : "border-base-300"
                }`}
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? "border-primary" : "border-base-300"
                  }`}
                >
                  {active ? (
                    <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="font-semibold">{option.label}</Text>
                  <Text className="text-xs text-base-content/60">
                    {option.eta}
                  </Text>
                </View>
                <Text className="font-semibold">{naira(option.feeInKobo)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4">
          <Text className="mb-3 font-bold">Payment method</Text>
          {PAYMENT_OPTIONS.map((option) => {
            const active = option.id === paymentType;
            return (
              <Pressable
                key={option.id}
                onPress={() => setPaymentType(option.id)}
                className={`mb-2 flex-row items-center rounded-xl border p-3 ${
                  active ? "border-primary bg-primary/5" : "border-base-300"
                }`}
              >
                <Text className="mr-3 text-xl">{option.icon}</Text>
                <View className="flex-1">
                  <Text className="font-semibold">{option.label}</Text>
                  <Text className="text-xs text-base-content/60">
                    {option.hint}
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? "border-primary" : "border-base-300"
                  }`}
                >
                  {active ? (
                    <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
<View className="mt-4 rounded-2xl border border-base-300 bg-base-100 p-4">
          <Text className="mb-3 font-bold">Order summary</Text>
          {items.map((item) => (
            <View
              key={item.productId}
              className="mb-1 flex-row justify-between text-sm"
            >
              <Text className="flex-1 pr-2 text-base-content/80">
                {item.name} × {item.quantity}
              </Text>
              <Text>{naira(item.lineTotalInKobo)}</Text>
            </View>
          ))}
          <View className="mt-3 gap-1 border-t border-base-200 pt-3 text-sm">
            <View className="flex-row justify-between">
              <Text className="text-base-content/70">Subtotal</Text>
              <Text>{naira(subtotalInKobo)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-base-content/70">Delivery</Text>
              <Text>{naira(fee)}</Text>
            </View>
            <View className="mt-1 flex-row justify-between text-base">
              <Text className="font-bold">Total</Text>
              <Text className="font-bold text-primary">{naira(total)}</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View className="mt-4 rounded-xl bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={!canSubmit || submitting}
          className={`mt-5 items-center rounded-xl py-4 ${
            canSubmit && !submitting ? "bg-primary" : "bg-base-300"
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`text-base font-bold ${
                canSubmit ? "text-white" : "text-base-content/40"
              }`}
            >
              Pay {naira(total)}
            </Text>
          )}
        </Pressable>

        <Text className="mt-3 text-center text-xs text-base-content/50">
          You will be redirected to Paystack to complete payment securely.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}