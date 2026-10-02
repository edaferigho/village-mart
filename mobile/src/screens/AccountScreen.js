/**
 * Account / sign-in screen — DEVICE PAIRING.
 *
 * The customer generates a 6-digit code on the WEBSITE (Account → "Connect
 * the mobile app") and enters it here; the backend returns the same session
 * the website uses, so both platforms share one account (orders + cart).
 */
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useAuth } from "../auth";
import { api } from "../api";

export default function AccountScreen() {
  const { user, signOut, signInWithPairingCode } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pair = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const paired = await signInWithPairingCode(code.trim());
      setCode("");
      Alert.alert("Signed in ✓", `Welcome, ${paired.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <TouchableOpacity style={[styles.cta, { backgroundColor: "#F1F5F9" }]} onPress={signOut}>
            <Text style={[styles.ctaText, { color: "#DC2626" }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          This is the same account you use on the website — your orders and cart stay in sync.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>📱</Text>
        <Text style={styles.title}>Connect to your account</Text>
        <Text style={styles.body}>
          On the website: sign in, open <Text style={{ fontWeight: "700" }}>My Orders</Text>, tap{" "}
          <Text style={{ fontWeight: "700" }}>"Connect the mobile app"</Text> and enter the 6-digit
          code here.
        </Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          placeholder="• • • • • •"
          style={styles.codeInput}
          maxLength={6}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.cta, code.length !== 6 && { opacity: 0.5 }]}
          onPress={pair}
          disabled={code.length !== 6 || busy}
        >
          <Text style={styles.ctaText}>{busy ? "Connecting…" : "Pair & Sign In"}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          You can also keep shopping as a guest — add items now and pair later; your cart merges
          into your account automatically.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 22, elevation: 2,
    alignItems: "center",
  },
  icon: { fontSize: 40 },
  title: { fontSize: 18, fontWeight: "800", color: "#0B1B33", marginTop: 8, textAlign: "center" },
  body: { color: "#64748B", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
  codeInput: {
    borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, marginTop: 16,
    fontSize: 26, letterSpacing: 12, textAlign: "center", paddingVertical: 10,
    width: "80%", color: "#0B1B33", fontWeight: "800",
  },
  error: { color: "#DC2626", fontSize: 12, marginTop: 8, textAlign: "center" },
  cta: { backgroundColor: "#2563EB", borderRadius: 10, alignSelf: "stretch", paddingVertical: 13, marginTop: 14, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  hint: { color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 18 },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF4FF",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 26, fontWeight: "800", color: "#2563EB" },
  name: { fontSize: 18, fontWeight: "800", color: "#0B1B33", marginTop: 10 },
  email: { color: "#64748B", fontSize: 13, marginTop: 2 },
});
