import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { fetchJson } from "@/constants/api";
import { Colors, Layout, Shadow, SoftShadow } from "@/constants/theme";

const screenWidth = Dimensions.get("window").width;
const C = Colors.light;

function smoothSeries(data: number[], windowSize = 5) {
  if (data.length <= 2) return data;

  const radius = Math.floor(windowSize / 2);
  return data.map((value, index) => {
    let total = 0;
    let weightTotal = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const sourceIndex = index + offset;
      if (sourceIndex < 0 || sourceIndex >= data.length) continue;

      const weight = radius + 1 - Math.abs(offset);
      total += data[sourceIndex] * weight;
      weightTotal += weight;
    }

    const smoothed = weightTotal > 0 ? total / weightTotal : value;
    return Math.max(0, Number(smoothed.toFixed(2)));
  });
}

function formatDateLabel(value: any) {
  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  }

  const text = String(value || "");
  return text.length >= 10 ? text.slice(5, 10) : text;
}

function getChartWidth(pointCount: number, zoom: number) {
  const pointWidth = pointCount > 90 ? 24 : 38;
  return Math.max(screenWidth - 72, pointCount * pointWidth * zoom);
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [online, setOnline] = useState(true);
  const [zoom, setZoom] = useState(1);

  const [stats, setStats] = useState({
    histori: 0,
    user: 1,
    hari: 0,
  });

  const [chart, setChart] = useState({
    labels: [] as string[],
    actual: [] as number[],
    forecast: [] as number[],
  });

  useEffect(() => {
    loadUser();
    loadData();

    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadUser = async () => {
    const u = await AsyncStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  };

  const loadData = async () => {
    try {
      const [hist, pred, apiStats] = await Promise.all([
        fetchJson("/api/history"),
        fetchJson("/api/peramalan"),
        fetchJson("/api/stats"),
      ]);

      setOnline(true);

      setStats({
        histori: Number(apiStats?.histori) || 0,
        user: Number(apiStats?.user) || 1,
        hari: Number(apiStats?.hari ?? apiStats?.histori) || 0,
      });

      const actualRaw = (hist || []).slice(0, 48).reverse();
      const forecastRaw = (pred?.prediksi || []).slice(0, 12);

      setChart({
        labels: actualRaw.map((d: any, i: number) =>
          i % 4 === 0 ? formatDateLabel(d.tanggal) : ""
        ),
        actual: smoothSeries(actualRaw.map((d: any) => Number(d.barang_keluar) || 0)),
        forecast: smoothSeries(forecastRaw.map((d: any) => Number(d.prediksi) || 0)),
      });
    } catch (e) {
      console.log("ERROR:", e);
      setOnline(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{
        backgroundColor: C.primary,
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 18,
        borderBottomWidth: 3,
        borderBottomColor: C.green,
      }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}>
          <View>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>
              EDAMAME
            </Text>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
              ADMIN
            </Text>
          </View>
          <View style={{
            backgroundColor: online ? C.greenSoft : C.redSoft,
            borderColor: online ? C.green : C.red,
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}>
            <Text style={{
              color: online ? C.greenDark : C.red,
              fontWeight: "700",
              fontSize: 11,
            }}>
              {online ? "Server Online" : "Server Offline"}
            </Text>
          </View>
        </View>

        <Text style={{ color: "#fff", fontSize: 14 }}>
          Halo,
        </Text>
        <Text style={{
          color: "#fff",
          fontSize: 22,
          fontWeight: "800",
          marginTop: 2,
        }}>
          {user?.nama || "User"}
        </Text>
        <Text style={{ color: "#dbe4ee", marginTop: 5 }}>
          Dashboard peramalan produksi edamame.
        </Text>
      </View>

      <View style={{
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 10,
      }}>
        {statCard("Histori", stats.histori)}
        {statCard("User", stats.user)}
        {statCard("Hari", stats.hari)}
      </View>

      <View style={{
        margin: 16,
        backgroundColor: C.card,
        borderRadius: Layout.radius,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        ...Shadow,
      }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <View>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
              Grafik Penjualan
            </Text>
            <Text style={{ color: C.subText, fontSize: 12, marginTop: 3 }}>
              Data aktual diperhalus untuk membaca tren.
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            {zoomButton("-", () =>
              setZoom(prev => Math.max(0.75, Number((prev - 0.25).toFixed(2))))
            )}
            <Text style={{ color: C.subText, fontSize: 11, minWidth: 42, textAlign: "center" }}>
              {zoom.toFixed(2)}x
            </Text>
            {zoomButton("+", () =>
              setZoom(prev => Math.min(2.5, Number((prev + 0.25).toFixed(2))))
            )}
          </View>
        </View>

        {chart.actual.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <LineChart
              data={{
                labels: chart.labels,
                datasets: [
                  {
                    data: chart.actual,
                    color: () => C.chartActual,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={getChartWidth(chart.actual.length, zoom)}
              height={252}
              withDots={chart.actual.length <= 48}
              withInnerLines
              withOuterLines={false}
              withShadow={false}
              segments={4}
              yLabelsOffset={8}
              xLabelsOffset={-3}
              bezier
              chartConfig={{
                backgroundGradientFrom: C.card,
                backgroundGradientTo: C.card,
                color: (opacity = 1) => `rgba(30,43,60,${opacity})`,
                labelColor: () => C.mutedText,
                decimalPlaces: 0,
                propsForBackgroundLines: {
                  stroke: C.chartGrid,
                  strokeDasharray: "4 6",
                  strokeWidth: 1,
                },
                propsForLabels: {
                  fontSize: 11,
                },
                propsForDots: {
                  r: "3",
                  strokeWidth: "2",
                  stroke: C.card,
                },
              }}
              style={{ borderRadius: Layout.radius }}
            />
          </ScrollView>
        ) : (
          <Text style={{ textAlign: "center", color: C.subText, paddingVertical: 28 }}>
            Tidak ada data
          </Text>
        )}

        <View style={{ flexDirection: "row", marginTop: 10, gap: 14 }}>
          <Text style={{ color: C.chartActual, fontSize: 12, fontWeight: "700" }}>
            Aktual
          </Text>
          <Text style={{ color: C.chartForecast, fontSize: 12, fontWeight: "700" }}>
            Prediksi tersedia: {chart.forecast.length}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function statCard(title: string, value: number) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.card,
      padding: 14,
      borderRadius: Layout.radius,
      borderWidth: 1,
      borderColor: C.border,
      borderLeftWidth: 3,
      borderLeftColor: C.green,
      ...SoftShadow,
    }}>
      <Text style={{ fontSize: 11, color: C.subText, fontWeight: "600" }}>
        {title}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: "800", marginTop: 4, color: C.text }}>
        {value}
      </Text>
    </View>
  );
}

function zoomButton(label: string, onPress: () => void) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.softCard,
        width: 31,
        height: 29,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontWeight: "800", color: C.primary, fontSize: 15 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
