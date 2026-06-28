import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Colors, Layout, Shadow } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchJson } from "@/constants/api";

const C = Colors.light;

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const data = await fetchJson("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (data.status === "success") {
        try {
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        } catch (e) {
          console.log("Gagal simpan user:", e);
        }

        router.replace("/(tabs)");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Terjadi kesalahan saat login.");
      console.log("Login error:", error);
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: C.background,
      justifyContent: "center",
      alignItems: "center",
      padding: 20
    }}>

      {/* CARD */}
      <View style={{
        width: "100%",
        backgroundColor: C.card,
        borderRadius: Layout.radius,
        padding: 20,
        borderWidth: 1,
        borderColor: C.border,
        ...Shadow
      }}>

        <Text style={{
          fontSize: 22,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: 6,
          color: C.text
        }}>
          EDAMAME ADMIN
        </Text>
        <Text style={{
          color: C.subText,
          textAlign: "center",
          marginBottom: 20,
        }}>
          Masuk ke dashboard peramalan
        </Text>

        {/* EMAIL */}
        <Text style={{ marginBottom: 5, color: C.text, fontWeight: "700" }}>Email</Text>
        <TextInput
          placeholder="admin@gmail.com"
          placeholderTextColor={C.mutedText}
          value={email}
          onChangeText={setEmail}
          style={{
            backgroundColor: C.input,
            borderWidth: 1,
            borderColor: C.strongBorder,
            padding: 12,
            borderRadius: 7,
            marginBottom: 12
          }}
        />

        {/* PASSWORD */}
        <Text style={{ marginBottom: 5, color: C.text, fontWeight: "700" }}>Kata Sandi</Text>
        <TextInput
          placeholder="******"
          placeholderTextColor={C.mutedText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            backgroundColor: C.input,
            borderWidth: 1,
            borderColor: C.strongBorder,
            padding: 12,
            borderRadius: 7,
            marginBottom: 16
          }}
        />

        {/* BUTTON LOGIN */}
        <TouchableOpacity
          onPress={handleLogin}
          style={{
            backgroundColor: C.green,
            padding: 12,
            borderRadius: 7,
            marginBottom: 10
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
            Masuk
          </Text>
        </TouchableOpacity>

        {/* REGISTER BUTTON */}
        <TouchableOpacity
          onPress={() => router.push("/register")}
          style={{
            backgroundColor: C.primary,
            padding: 12,
            borderRadius: 7
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
            Daftar Akun Baru
          </Text>
        </TouchableOpacity>

        {/* BACK */}
        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text style={{
            textAlign: "center",
            marginTop: 15,
            color: C.green,
            fontWeight: "700"
          }}>
            ← Kembali ke Beranda
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
