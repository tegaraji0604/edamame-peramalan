import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Colors, Layout, Shadow } from "@/constants/theme";
import { fetchJson } from "@/constants/api";

const C = Colors.light;

export default function RegisterScreen() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      const data = await fetchJson("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email, password }),
      });

      if (data.status === "success") {
        Alert.alert("Sukses", "Akun berhasil dibuat");
        router.replace("/login");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Tidak bisa konek ke server");
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
          color: C.text,
          fontSize: 22,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: 6
        }}>
          DAFTAR AKUN
        </Text>
        <Text style={{ color: C.subText, textAlign: "center", marginBottom: 20 }}>
          Buat akses baru untuk dashboard
        </Text>

        <TextInput
          placeholder="Nama Lengkap"
          placeholderTextColor={C.mutedText}
          value={nama}
          onChangeText={setNama}
          style={input}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={C.mutedText}
          value={email}
          onChangeText={setEmail}
          style={input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor={C.mutedText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={input}
        />

        <TouchableOpacity
          onPress={handleRegister}
          style={{
            backgroundColor: C.green,
            padding: 12,
            borderRadius: 7,
            marginTop: 10
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
            Daftar Akun Baru
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={{
            textAlign: "center",
            marginTop: 15,
            color: C.green,
            fontWeight: "700"
          }}>
            Sudah punya akun? Login
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const input = {
  backgroundColor: C.input,
  borderWidth: 1,
  borderColor: C.strongBorder,
  padding: 12,
  borderRadius: 7,
  marginBottom: 10
};
