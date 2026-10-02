/**
 * Cart screen — the SAME cart as the website (server-synced).
 * Updates made on the website appear here automatically; changes made here
 * show up on the website too. Checkout places the order with Pay on
 * Delivery (Paystack online payment stays on the website).
 */
import React, { useState } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity, Alert, StyleSheet,
} from "react-native";
import { useCart } from "../cart";
import { useAuth } from "../auth";
import { api, API_URL } from "../api";
import { formatNaira } from "../format";

const DELIVERY_FEE = 2500;
const FREE_DELIVERY_THRESHOLD = 50000;

export default function CartScreen({ navigation }) {
  const { items, subtotal, setQuantity, clearCart, refresh } = useCart();
  const { user } = useAuth();
  const [placing, setPlacing] = useState(false);

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: {
          customer: {
            name: user?.name ?? "Mobile Guest",
            email: user?.email ?? "mobile-guest@example.com",
            phone: user?.phone ?? "08000000000",
          },
          delivery: {
            address: "To be confirmed by phone",
            city: "Lagos",
            state: "Lagos",
          },
          paymentMethod: "pay_on_delivery",
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      await clearCart();
      Alert.alert(
        "Order placed ✓",
        `Order #${data.orderNumber} — ${formatNaira(data.total)} (Pay on Delivery). Track it in Orders.`,
        [{ text: "View Orders", onPress: () => navigation.navigate("Orders") }]
      );
    } catch (err) {
      Alert.alert("Checkout failed", err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>🧺</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>
          Items you add on the website or here show up on both — instantly.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate("Shop")}>
          <Text style={styles.ctaText}>Browse the Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 12, paddingBottom: 180 }}
        renderItem={({ item }) => (
          <View style={styles.line}>
            <Image
              source={{
                uri: item.imageUrl
                  ? item.imageUrl.startsWith("http")
                    ? item.imageUrl
                    : `${API_URL}${item.imageUrl}`
                  : `${API_URL}/images/placeholder.svg`,
              }}
              style={styles.thumb}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.unit}>{item.unitLabel}</Text>
              <Text style={styles.price}>{formatNaira(item.price)}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setQuantity(item.productId, item.quantity - 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(item.productId, item.quantity + 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Sticky summary */}
      <View style={styles.summary}>
        <View style={styles.row}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text style={styles.strong}>{formatNaira(subtotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.muted}>Delivery</Text>
          <Text style={deliveryFee === 0 ? styles.free : styles.strong}>
            {deliveryFee === 0 ? "FREE" : formatNaira(deliveryFee)}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatNaira(total)}</Text>
        </View>
        <TouchableOpacity style={styles.cta} onPress={placeOrder} disabled={placing}>
          <Text style={styles.ctaText}>{placing ? "Placing order…" : `Place Order · ${formatNaira(total)}`}</Text>
        </TouchableOpacity>
        <Text style={styles.note}>Pay on Delivery · syncs with the website cart</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  line: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff",
    borderRadius: 12, padding: 10, marginBottom: 8, elevation: 1,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#F1F5F9" },
  name: { fontWeight: "700", color: "#0B1B33", fontSize: 13 },
  unit: { color: "#94A3B8", fontSize: 11 },
  price: { fontWeight: "800", color: "#0B1B33", fontSize: 13, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  stepText: { fontSize: 16, color: "#0B1B33", fontWeight: "700" },
  qty: { minWidth: 20, textAlign: "center", fontWeight: "700", color: "#0B1B33" },
  summary: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    padding: 14, borderTopWidth: 1, borderTopColor: "#E2E8F0",
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  muted: { color: "#64748B", fontSize: 13 },
  strong: { color: "#0B1B33", fontWeight: "700", fontSize: 13 },
  free: { color: "#059669", fontWeight: "700", fontSize: 13 },
  totalLabel: { color: "#0B1B33", fontWeight: "800", fontSize: 15 },
  total: { color: "#2563EB", fontWeight: "800", fontSize: 17 },
  cta: {
    backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 13,
    alignItems: "center", marginTop: 10,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  note: { textAlign: "center", color: "#94A3B8", fontSize: 11, marginTop: 6 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", padding: 30 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0B1B33", marginTop: 10 },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 6, lineHeight: 20 },
});
