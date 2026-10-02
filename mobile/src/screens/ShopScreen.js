/**
 * Shop screen — product catalog (same data as the website via /api/products).
 */
import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, Image, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet,
} from "react-native";
import { API_URL } from "../api";
import { useCart } from "../cart";
import { formatNaira } from "../format";

const CATEGORIES = ["All"];

export default function ShopScreen({ navigation }) {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (opts = {}) => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (!opts.keepCategory && category !== "All") params.set("category", category);
      if (query.trim()) params.set("q", query.trim());
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API_URL}/api/products?${params}`),
        fetch(`${API_URL}/api/categories`),
      ]);
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      setProducts(productsData.products ?? []);
      const names = (categoriesData.categories ?? []).map((c) => c.name);
      setCategories(["All", ...names]);
    } catch (err) {
      setError("Couldn't reach the store — pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, query]);

  React.useEffect(() => {
    load();
    // Reload whenever the Shop tab gains focus (fresh prices/stock).
    const unsub = navigation.addListener("tabPress", () => load({ keepCategory: true }));
    return unsub;
  }, [load, navigation]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri: item.image_url
            ? item.image_url.startsWith("http")
              ? item.image_url
              : `${API_URL}${item.image_url}`
            : `${API_URL}/images/placeholder.svg`,
        }}
        style={styles.image}
      />
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.unit}>{item.unit_label}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatNaira(item.price)}</Text>
        {item.compare_at_price && item.compare_at_price > item.price && (
          <Text style={styles.compare}>{formatNaira(item.compare_at_price)}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
        <Text style={styles.addBtnText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Brand header */}
      <View style={styles.header}>
        <Text style={styles.brand}>Village<Text style={{ color: "#60A5FA" }}>Mart</Text></Text>
        <Text style={styles.tagline}>Fresh foodstuff, honest prices</Text>
        <TextInput
          placeholder="Search rice, oil, pasta…"
          placeholderTextColor="#94A3B8"
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => load({ keepCategory: true })}
          returnKeyType="search"
        />
      </View>

      {/* Category chips */}
      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { setCategory(item); setTimeout(() => load({ keepCategory: true }), 0); }}
              style={[styles.chip, category === item && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563EB" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load({ keepCategory: true }); }} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No products match — try another search.</Text>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16 },
  brand: { color: "#fff", fontSize: 22, fontWeight: "800" },
  tagline: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  search: {
    backgroundColor: "#1E3A5F", color: "#fff", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 12, fontSize: 14,
  },
  chipsRow: { paddingHorizontal: 8, paddingVertical: 10, backgroundColor: "#fff" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "#F1F5F9", marginRight: 8,
  },
  chipActive: { backgroundColor: "#0B1B33" },
  chipText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: {
    flex: 1 / 2 - 0.02, backgroundColor: "#fff", borderRadius: 12, margin: 6,
    padding: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4,
  },
  image: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#F1F5F9" },
  name: { fontWeight: "700", color: "#0B1B33", marginTop: 8, fontSize: 13 },
  unit: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
  price: { fontWeight: "800", color: "#0B1B33", fontSize: 15 },
  compare: { color: "#CBD5E1", textDecorationLine: "line-through", fontSize: 11 },
  addBtn: {
    backgroundColor: "#2563EB", borderRadius: 8, paddingVertical: 8,
    alignItems: "center", marginTop: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 40 },
  error: { textAlign: "center", color: "#DC2626", marginTop: 40, paddingHorizontal: 20 },
});
