/**
 * Orders screen — the signed-in customer's order history (same account as
 * the website, via /api/orders/mine). Guests are shown the pairing prompt.
 */
import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../auth";
import { api } from "../api";
import { formatNaira } from "../format";

const STATUS_COLORS = {
  pending: "#B45309",
  confirmed: "#1D4ED8",
  delivered: "#059669",
  cancelled: "#DC2626",
};

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api("/api/orders/mine");
      setOrders(data.orders ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Reload each time the tab is focused.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!user) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.emptyTitle}>Sign in to see your orders</Text>
        <Text style={styles.emptyText}>
          Use the same account as the website — pair this device from Account → "Connect the mobile app".
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate("Account")}>
          <Text style={styles.ctaText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {error ?? "No orders yet — your website orders appear here too."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNo}>#{item.order_number}</Text>
              <Text style={styles.meta}>
                {new Date(item.created_at).toLocaleDateString("en-NG", {
                  day: "numeric", month: "short", year: "numeric",
                })}{" "}
                · {(item.order_items ?? []).reduce((s, i) => s + i.quantity, 0)} items
                {item.promo_code ? ` · ${item.promo_code}` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] ?? STATUS_COLORS.pending }]}>
                {item.status}
              </Text>
              {item.payment_status === "paid" && <Text style={styles.paid}>💳 Paid</Text>}
              <Text style={styles.total}>{formatNaira(item.total)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  card: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 14,
    marginBottom: 8, elevation: 1, justifyContent: "space-between",
  },
  orderNo: { fontWeight: "800", color: "#0B1B33", fontSize: 14 },
  meta: { color: "#64748B", fontSize: 12, marginTop: 3 },
  status: { fontWeight: "800", fontSize: 12, textTransform: "uppercase" },
  paid: { color: "#059669", fontWeight: "800", fontSize: 11 },
  total: { fontWeight: "800", color: "#0B1B33", fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", padding: 30 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0B1B33", marginTop: 10 },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 6, lineHeight: 20 },
  cta: { backgroundColor: "#2563EB", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 40, lineHeight: 20, padding: 20 },
});
