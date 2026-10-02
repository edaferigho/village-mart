/**
 * Auth state for the mobile app.
 *
 * Sign-in uses DEVICE PAIRING: the customer generates a 6-digit code on the
 * website (Account → "Connect the mobile app") and enters it here. The
 * backend exchanges the code for the SAME session token the website uses —
 * one account, same orders, same cart, on both platforms.
 *
 * Guests are supported too: a device id gives them a cart that later merges
 * into their account when they pair.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, getToken, setToken, getDeviceId } from "./api";

const USER_KEY = "vm_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);

  // Restore a previous session (if any) on app start.
  useEffect(() => {
    (async () => {
      const [token, savedUser, id] = await Promise.all([
        getToken(),
        AsyncStorage.getItem(USER_KEY),
        getDeviceId(),
      ]);
      if (token && savedUser) setUser(JSON.parse(savedUser));
      setDeviceId(id);
      setReady(true);
    })();
  }, []);

  /** Exchange a pairing code for a session token. */
  const signInWithPairingCode = async (code) => {
    const deviceId = await getDeviceId();
    const data = await api("/api/auth/pair/claim", {
      method: "POST",
      body: { code, deviceId },
    });
    await setToken(data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    await setToken(null);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, deviceId, signInWithPairingCode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
