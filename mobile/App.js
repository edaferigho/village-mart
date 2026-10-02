/**
 * Village Mart — mobile app root.
 *
 * Tab navigation (Shop · Cart · Orders · Account) wrapped in the auth and
 * cart providers. The cart provider keeps the SAME server-side cart as the
 * website (realtime + poll sync), so items added anywhere appear everywhere.
 */
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/auth";
import { CartProvider, useCart } from "./src/cart";
import ShopScreen from "./src/screens/ShopScreen";
import CartScreen from "./src/screens/CartScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import AccountScreen from "./src/screens/AccountScreen";

const Tab = createBottomTabNavigator();

const NAVY = "#0B1B33";
const BLUE = "#2563EB";

function IconBadge({ count, color }) {
  return count > 0 ? (
    <View
      style={{
        position: "absolute", right: -6, top: -3,
        backgroundColor: color ?? "#2563EB", borderRadius: 8,
        minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
        paddingHorizontal: 3,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{count}</Text>
    </View>
  ) : null;
}

function Tabs() {
  const { itemCount } = useCart();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          title: "Village Mart",
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="basket" size={size} color={color} />
              <IconBadge count={itemCount} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: user ? "Account" : "Sign In",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tabs />
        </NavigationContainer>
      </CartProvider>
    </AuthProvider>
  );
}
