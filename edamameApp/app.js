import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { fetchJson } from "./constants/api";

export default function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchJson("/api/history")
      .then(res => {
        console.log(res);
        setData(res);
      })
      .catch(err => console.log("ERROR:", err));
  }, []);

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        Data Histori
      </Text>

      {data.map((item, i) => (
        <View key={i} style={{
          marginTop: 10,
          padding: 10,
          backgroundColor: "#f5f5f5",
          borderRadius: 8
        }}>
          <Text>Tanggal: {item.tanggal}</Text>
          <Text>Keluar: {item.barang_keluar}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
