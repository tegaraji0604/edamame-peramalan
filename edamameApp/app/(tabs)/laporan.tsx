import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fetchJson, getApiUrl } from "@/constants/api";
import { Colors, Layout, Shadow, SoftShadow } from "@/constants/theme";
import {
  CalculationRow,
  ForecastSuggestion,
  PredictionCalculationTable,
} from "@/components/forecast-insights";

const screenWidth = Dimensions.get("window").width;
const C = Colors.light;

const HORIZON_OPTIONS = [
  { label: "1 Bulan", value: 30 },
  { label: "3 Bulan", value: 90 },
  { label: "6 Bulan", value: 180 },
  { label: "1 Tahun", value: 365 },
];

type Evaluasi = {
  mae?: number;
  mape?: number;
  rmse?: number;
  mae_percent?: number;
  rmse_percent?: number;
  avg_actual?: number;
};

type DiagnosticSeries = {
  labels?: number[];
  values?: (number | null)[];
  confidence?: number | null;
};

type ForecastDiagnostics = {
  acf?: DiagnosticSeries;
  pacf?: DiagnosticSeries;
  adf?: {
    statistic?: number | null;
    p_value?: number | null;
    lags?: number | null;
    nobs?: number | null;
    stationary?: boolean;
    summary?: string;
  };
  preprocessing?: {
    original_rows?: number;
    daily_rows?: number;
    duplicate_rows?: number;
    missing_days_filled?: number;
    zero_sales_rows?: number;
    start_date?: string | null;
    end_date?: string | null;
    steps?: string[];
  };
};

export default function LaporanScreen() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [selectedHorizon, setSelectedHorizon] = useState(30);
  const [historiCount, setHistoriCount] = useState(0);
  const [evaluasi, setEvaluasi] = useState<Evaluasi | null>(null);
  const [calculationRows, setCalculationRows] = useState<CalculationRow[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showManualVerify, setShowManualVerify] = useState(false);

  const [actual, setActual] = useState<number[]>([]);
  const [actualLabels, setActualLabels] = useState<string[]>([]);
  const [uji, setUji] = useState<number[]>([]);
  const [ujiLabels, setUjiLabels] = useState<string[]>([]);
  const [forecast, setForecast] = useState<number[]>([]);
  const [forecastLabels, setForecastLabels] = useState<string[]>([]);
  const [forecastDaily, setForecastDaily] = useState<number[]>([]);
  const [forecastDailyLabels, setForecastDailyLabels] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<ForecastDiagnostics | null>(null);

  const [modelDetails, setModelDetails] = useState<{
    p_order: number;
    d_order: number;
    q_order: number;
    model_name: string;
    n_train: number;
    n_test: number;
    mae_daily: number;
    mape_daily: number;
    rmse_daily: number;
    total_abs_error: number;
    total_sq_error: number;
    total_ape: number;
    manual_rows: Array<{
      tanggal: string;
      aktual: number;
      prediksi: number;
      error: number;
      abs_error: number;
      sq_error: number;
      ape: number | null;
    }>;
    last_run: string;
  } | null>(null);

  useEffect(() => {
    loadLaporan(selectedHorizon);
  }, [selectedHorizon]);

  const loadLaporan = async (horizon: number) => {
    try {
      setLoading(true);

      const [histori, evalData, forecastData] = await Promise.all([
        fetchJson("/api/history"),
        fetchJson(`/api/evaluasi?horizon=${horizon}`),
        fetchJson(`/api/peramalan?horizon=${horizon}`),
      ]);

      setOnline(true);
      setHistoriCount(Array.isArray(histori) ? histori.length : 0);
      
      setEvaluasi({
        mae: Number(forecastData?.mae) || 0,
        mape: Number(forecastData?.mape) || 0,
        rmse: Number(forecastData?.rmse) || 0,
        mae_percent: Number(forecastData?.mae_percent) || 0,
        rmse_percent: Number(forecastData?.rmse_percent) || 0,
        avg_actual: Number(forecastData?.avg_actual) || 0,
      });

      const actVals = (forecastData?.act_vals || []) as number[];
      const actLabelsRaw = (forecastData?.act_labels || []) as string[];
      const ujiVals = (forecastData?.uji_vals || []) as Array<number | null>;
      const fcVals = (forecastData?.fc_vals || []) as number[];
      const fcLabelsRaw = (forecastData?.fc_labels || []) as string[];
      const fcDailyVals = (forecastData?.fc_vals_daily || []) as number[];
      const fcDailyLabelsRaw = (forecastData?.fc_labels_daily || []) as string[];
      const compactUji = compactSeries(actLabelsRaw, ujiVals);

      setActual(actVals.map(Number));
      setActualLabels(actLabelsRaw);
      setUji(compactUji.values);
      setUjiLabels(compactUji.labels);
      setForecast(fcVals.map(Number));
      setForecastLabels(fcLabelsRaw);
      setForecastDaily(fcDailyVals.map(Number));
      setForecastDailyLabels(fcDailyLabelsRaw);
      setDiagnostics(forecastData?.diagnostics || null);

      setCalculationRows(buildCalculationRows(
        (forecastData?.test_labels_daily || []) as string[],
        (forecastData?.test_actuals_daily || []) as number[],
        (forecastData?.test_preds_daily || []) as number[],
      ));

      let lastRunText = "-";
      if (evalData?.created_at) {
        const dateObj = new Date(evalData.created_at);
        if (!isNaN(dateObj.getTime())) {
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();
          const hour = String(dateObj.getHours()).padStart(2, "0");
          const minute = String(dateObj.getMinutes()).padStart(2, "0");
          lastRunText = `${day}-${month}-${year} ${hour}:${minute}`;
        }
      } else {
        const dateObj = new Date();
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const year = dateObj.getFullYear();
        const hour = String(dateObj.getHours()).padStart(2, "0");
        const minute = String(dateObj.getMinutes()).padStart(2, "0");
        lastRunText = `${day}-${month}-${year} ${hour}:${minute}`;
      }

      setModelDetails({
        p_order: Number(forecastData?.p_order) || 1,
        d_order: Number(forecastData?.d_order) || 0,
        q_order: Number(forecastData?.q_order) || 1,
        model_name: String(forecastData?.model_name || "hybrid"),
        n_train: Number(forecastData?.n_train) || 0,
        n_test: Number(forecastData?.n_test) || 0,
        mae_daily: Number(forecastData?.mae_daily) || 0,
        mape_daily: Number(forecastData?.mape_daily) || 0,
        rmse_daily: Number(forecastData?.rmse_daily) || 0,
        total_abs_error: Number(forecastData?.total_abs_error) || 0,
        total_sq_error: Number(forecastData?.total_sq_error) || 0,
        total_ape: Number(forecastData?.total_ape) || 0,
        manual_rows: (forecastData?.manual_rows || []) as any[],
        last_run: lastRunText,
      });
    } catch (e) {
      console.log("LAPORAN ERROR:", e);
      setOnline(false);
      setCalculationRows([]);
      setActual([]);
      setActualLabels([]);
      setUji([]);
      setUjiLabels([]);
      setForecast([]);
      setForecastLabels([]);
      setForecastDaily([]);
      setForecastDailyLabels([]);
      setDiagnostics(null);
      setModelDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const openPdf = async () => {
    if (pdfLoading) return;

    try {
      setPdfLoading(true);
      const url = getApiUrl(`/api/laporan-pdf?horizon=${selectedHorizon}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Backend mengembalikan status ${response.status}`);
      }

      const html = await response.text();
      const printed = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
        base64: false,
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileNameBase = `laporan-edamame-${stamp}-${selectedHorizon}-hari`;
      const savedUri = await savePdfToAndroid(printed.uri, fileNameBase);

      await openSavedPdf(savedUri || printed.uri);
    } catch (error) {
      console.log("PDF ERROR:", error);
      Alert.alert("Gagal", "Laporan PDF tidak bisa dibuat atau dibuka di perangkat ini.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
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
          marginBottom: 8,
        }}>
          <Text style={{ color: "#fff", fontSize: 19, fontWeight: "800" }}>
            Laporan Analisis Penjualan
          </Text>
          <View style={{
            backgroundColor: online ? C.greenSoft : C.redSoft,
            borderColor: online ? C.green : C.red,
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 11,
            paddingVertical: 6,
          }}>
            <Text style={{
              color: online ? C.greenDark : C.red,
              fontSize: 11,
              fontWeight: "700",
            }}>
              {online ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
        <Text style={{ color: "#dbe4ee", lineHeight: 20, fontSize: 12, marginBottom: 8 }}>
          Rekapitulasi data historis, prediksi ARIMAX, evaluasi model, perhitungan manual, dan saran operasional.
        </Text>
        {modelDetails?.last_run && (
          <Text style={{ color: "#95a5a6", fontSize: 11 }}>
            Model terakhir dijalankan: {modelDetails.last_run}
          </Text>
        )}
      </View>

      {/* Horizon selector */}
      <View style={{
        margin: 16,
        backgroundColor: C.card,
        padding: 14,
        borderRadius: Layout.radius,
        borderWidth: 1,
        borderColor: C.border,
        ...Shadow,
      }}>
        <Text style={{ color: C.text, fontWeight: "800", marginBottom: 10 }}>
          Periode Prediksi
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {HORIZON_OPTIONS.map(option => {
            const active = selectedHorizon === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSelectedHorizon(option.value)}
                style={{
                  backgroundColor: active ? C.green : C.softCard,
                  borderColor: active ? C.green : C.strongBorder,
                  borderWidth: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 7,
                }}
              >
                <Text style={{
                  color: active ? "#fff" : C.text,
                  fontWeight: "800",
                  fontSize: 12,
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 1. Evaluasi Model Section (Gambar 1 style) */}
      {evaluasi && (
        <View style={{
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: C.card,
          padding: 16,
          borderRadius: Layout.radius,
          borderWidth: 1,
          borderColor: C.border,
          ...Shadow,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
                1. Evaluasi Model
              </Text>
              <Text style={{ color: C.subText, fontSize: 11, marginTop: 2 }}>
                Akurasi model terakhir berdasarkan data uji historis.
              </Text>
            </View>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "#eaf7f0",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Text style={{ color: "#27ae60", fontSize: 11, fontWeight: "800" }}>1</Text>
            </View>
          </View>

          {/* 3 Columns Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            {/* MAE */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "#2980b9", fontSize: 20, fontWeight: "800" }}>
                {evaluasi.mae_percent ? `${evaluasi.mae_percent.toFixed(2)}%` : "-%"}
              </Text>
              <Text style={{ color: "#526273", fontSize: 10, fontWeight: "800", marginTop: 4 }}>
                MAE
              </Text>
              <Text style={{ color: "#7f8c8d", fontSize: 10, marginTop: 2 }}>
                ({evaluasi.mae ? `${evaluasi.mae.toFixed(2)} unit` : "-"})
              </Text>
              <View style={{
                marginTop: 8,
                backgroundColor: (evaluasi.mae_percent ?? 0) < 10 ? "#eafaf1" : (evaluasi.mae_percent ?? 0) <= 20 ? "#fffbee" : "#fff5f5",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
                <Text style={{
                  color: (evaluasi.mae_percent ?? 0) < 10 ? "#27ae60" : (evaluasi.mae_percent ?? 0) <= 20 ? "#e67e22" : "#c0392b",
                  fontSize: 9,
                  fontWeight: "700",
                }}>
                  {(evaluasi.mae_percent ?? 0) < 10 ? "✓ Baik" : (evaluasi.mae_percent ?? 0) <= 20 ? "⚠ Cukup" : "✗ Tinggi"}
                </Text>
              </View>
            </View>

            {/* MAPE */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "#27ae60", fontSize: 20, fontWeight: "800" }}>
                {evaluasi.mape ? `${evaluasi.mape.toFixed(2)}%` : "-%"}
              </Text>
              <Text style={{ color: "#526273", fontSize: 10, fontWeight: "800", marginTop: 4 }}>
                MAPE
              </Text>
              <Text style={{ color: "#7f8c8d", fontSize: 10, marginTop: 2 }}>
                (target &lt; 20%)
              </Text>
              <View style={{
                marginTop: 8,
                backgroundColor: (evaluasi.mape ?? 0) < 10 ? "#eafaf1" : (evaluasi.mape ?? 0) <= 20 ? "#eefaf3" : (evaluasi.mape ?? 0) <= 50 ? "#fffbee" : "#fff5f5",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
                <Text style={{
                  color: (evaluasi.mape ?? 0) < 10 ? "#27ae60" : (evaluasi.mape ?? 0) <= 20 ? "#16a085" : (evaluasi.mape ?? 0) <= 50 ? "#e67e22" : "#c0392b",
                  fontSize: 9,
                  fontWeight: "700",
                }}>
                  {(evaluasi.mape ?? 0) < 10 ? "✓ Sangat Baik" : (evaluasi.mape ?? 0) <= 20 ? "✓ Baik" : (evaluasi.mape ?? 0) <= 50 ? "⚠ Cukup" : "✗ Buruk"}
                </Text>
              </View>
            </View>

            {/* RMSE */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "#e74c3c", fontSize: 20, fontWeight: "800" }}>
                {evaluasi.rmse_percent ? `${evaluasi.rmse_percent.toFixed(2)}%` : "-%"}
              </Text>
              <Text style={{ color: "#526273", fontSize: 10, fontWeight: "800", marginTop: 4 }}>
                RMSE
              </Text>
              <Text style={{ color: "#7f8c8d", fontSize: 10, marginTop: 2 }}>
                ({evaluasi.rmse ? `${evaluasi.rmse.toFixed(2)} unit` : "-"})
              </Text>
              <View style={{
                marginTop: 8,
                backgroundColor: (evaluasi.rmse_percent ?? 0) < 10 ? "#eafaf1" : (evaluasi.rmse_percent ?? 0) <= 20 ? "#eefaf3" : "#fff5f5",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
                <Text style={{
                  color: (evaluasi.rmse_percent ?? 0) < 10 ? "#27ae60" : (evaluasi.rmse_percent ?? 0) <= 20 ? "#16a085" : "#c0392b",
                  fontSize: 9,
                  fontWeight: "700",
                }}>
                  {(evaluasi.rmse_percent ?? 0) < 10 ? "✓ Sangat Baik" : (evaluasi.rmse_percent ?? 0) <= 20 ? "✓ Baik" : "✗ Perlu Opt."}
                </Text>
              </View>
            </View>
          </View>

          {/* Underlines */}
          <View style={{ flexDirection: "row", height: 3, marginTop: 14, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: "#1a2535", marginRight: 4 }} />
            <View style={{ flex: 1, backgroundColor: "#27ae60", marginRight: 4 }} />
            <View style={{ flex: 1, backgroundColor: "#e74c3c" }} />
          </View>

          {/* Info Box */}
          <View style={{
            backgroundColor: "#f4f6f9",
            borderLeftWidth: 4,
            borderLeftColor: "#2980b9",
            borderRadius: 6,
            padding: 10,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 6,
          }}>
            <Text style={{ fontSize: 11, color: "#526273", flex: 1, lineHeight: 16 }}>
              ℹ️ <Text style={{ fontWeight: "700" }}>Keterangan:</Text> MAE dan RMSE ditampilkan sebagai persentase terhadap rata-rata data uji agar lebih mudah diinterpretasikan. Nilai asli tetap tersedia dalam satuan penjualan (unit). Rata-rata data uji: <Text style={{ fontWeight: "700" }}>{evaluasi.avg_actual ? evaluasi.avg_actual.toFixed(2) : "-"} unit</Text>.
            </Text>
          </View>
        </View>
      )}

      {/* 2. Diagnostik Data Section */}
      {!loading && diagnostics && (
        <View style={{ marginBottom: 4 }}>
          <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
              2. Diagnostik Data
            </Text>
          </View>
          <ForecastDiagnosticsSection diagnostics={diagnostics} />
        </View>
      )}

      {/* 3. Grafik Visualisasi Section */}
      {!loading && actual.length > 0 && (
        <View style={{
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: C.card,
          padding: 16,
          borderRadius: Layout.radius,
          borderWidth: 1,
          borderColor: C.border,
          ...Shadow,
        }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
                3. Grafik Visualisasi
              </Text>
              <Text style={{ color: C.subText, fontSize: 11, marginTop: 2 }}>
                Perbandingan data aktual, data uji, dan proyeksi dalam satu grafik.
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {zoomButton("-", () =>
                setZoom(prev => Math.max(0.75, Number((prev - 0.25).toFixed(2))))
              )}
              <Text style={{ color: C.subText, alignSelf: "center", fontSize: 11, minWidth: 44, textAlign: "center" }}>
                {zoom.toFixed(2)}x
              </Text>
              {zoomButton("+", () =>
                setZoom(prev => Math.min(2.5, Number((prev + 0.25).toFixed(2))))
              )}
            </View>
          </View>

          <SeparatedLineChart
            title="Grafik Data Aktual"
            subtitle="Data aktual penjualan yang menjadi dasar peramalan."
            labels={actualLabels}
            values={actual}
            color="30,43,60"
            zoom={zoom}
          />
          <SeparatedLineChart
            title="Grafik Data Uji"
            subtitle="Data uji hasil validasi model pada periode histori."
            labels={ujiLabels}
            values={uji}
            color="41,128,185"
            zoom={zoom}
          />
          <SeparatedLineChart
            title="Grafik Proyeksi"
            subtitle="Hasil proyeksi ARIMAX untuk periode yang dipilih."
            labels={forecastDailyLabels.length ? forecastDailyLabels : forecastLabels}
            values={forecastDaily.length ? forecastDaily : forecast}
            color="39,174,96"
            zoom={zoom}
          />
        </View>
      )}

      {/* 4. Tabel Perhitungan & Evaluasi Model Section */}
      {!loading && calculationRows.length > 0 && (
        <View style={{ marginBottom: 4 }}>
          <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
              4. Tabel Perhitungan &amp; Evaluasi Model
            </Text>
            <Text style={{ color: C.subText, fontSize: 11, marginTop: 2 }}>
              Evaluasi model ARIMAX periode data uji — rumus sesuai standar akademik skripsi.
            </Text>
          </View>

          {/* Model Meta Chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
            <View style={{
              backgroundColor: "#f4f7fa",
              borderLeftWidth: 3,
              borderLeftColor: "#27ae60",
              borderRadius: 7,
              paddingVertical: 6,
              paddingHorizontal: 10,
            }}>
              <Text style={{ fontSize: 11, color: "#526273" }}>
                <Text style={{ fontWeight: "700", color: "#1a2535" }}>Model:</Text> ARIMAX({modelDetails?.p_order ?? 1}, {modelDetails?.d_order ?? 0}, {modelDetails?.q_order ?? 1})
              </Text>
            </View>
            <View style={{
              backgroundColor: "#f4f7fa",
              borderLeftWidth: 3,
              borderLeftColor: "#27ae60",
              borderRadius: 7,
              paddingVertical: 6,
              paddingHorizontal: 10,
            }}>
              <Text style={{ fontSize: 11, color: "#526273" }}>
                <Text style={{ fontWeight: "700", color: "#1a2535" }}>Algoritma:</Text> {modelDetails?.model_name ?? "hybrid"}
              </Text>
            </View>
            {calculationRows.length > 0 && (
              <View style={{
                backgroundColor: "#f4f7fa",
                borderLeftWidth: 3,
                borderLeftColor: "#27ae60",
                borderRadius: 7,
                paddingVertical: 6,
                paddingHorizontal: 10,
              }}>
                <Text style={{ fontSize: 11, color: "#526273" }}>
                  <Text style={{ fontWeight: "700", color: "#1a2535" }}>Periode uji:</Text> {calculationRows[0].periode} s/d {calculationRows[calculationRows.length - 1].periode}
                </Text>
              </View>
            )}
          </View>

          {/* Collapsible Contoh Perhitungan Manual (10 Data Pertama) */}
          {modelDetails?.manual_rows && modelDetails.manual_rows.length > 0 && (
            <View style={{
              marginHorizontal: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#e3e8ef",
              borderRadius: 8,
              backgroundColor: C.card,
              padding: 12,
              ...Shadow,
            }}>
              <TouchableOpacity
                onPress={() => setShowManualVerify(!showManualVerify)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "700", color: "#2980b9", fontSize: 13 }}>
                  🔎 Contoh Perhitungan Manual (10 Data Pertama)
                </Text>
                <Text style={{ fontWeight: "800", color: "#2980b9", fontSize: 13 }}>
                  {showManualVerify ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showManualVerify && (
                <View style={{ marginTop: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: 640 }}>
                      <View style={{
                        flexDirection: "row",
                        backgroundColor: "#f4f6fa",
                        borderBottomWidth: 1,
                        borderBottomColor: "#dee2e6",
                        paddingVertical: 6,
                      }}>
                        <Text style={{ width: 30, paddingHorizontal: 6, fontWeight: "700", fontSize: 10 }}>#</Text>
                        <Text style={{ width: 80, paddingHorizontal: 6, fontWeight: "700", fontSize: 10 }}>Tanggal</Text>
                        <Text style={{ width: 70, paddingHorizontal: 6, fontWeight: "700", fontSize: 10, textAlign: "right" }}>Aktual</Text>
                        <Text style={{ width: 80, paddingHorizontal: 6, fontWeight: "700", fontSize: 10, textAlign: "right" }}>Prediksi</Text>
                        <Text style={{ width: 90, paddingHorizontal: 6, fontWeight: "700", fontSize: 10, textAlign: "right" }}>Error=A-P</Text>
                        <Text style={{ width: 70, paddingHorizontal: 6, fontWeight: "700", fontSize: 10, textAlign: "right" }}>|Error|</Text>
                        <Text style={{ width: 80, paddingHorizontal: 6, fontWeight: "700", fontSize: 10, textAlign: "right" }}>Error²</Text>
                        <Text style={{ width: 70, paddingHorizontal: 6, fontWeight: "700", fontSize: 10, textAlign: "right" }}>APE (%)</Text>
                      </View>

                      {modelDetails.manual_rows.filter(r => r.aktual > 0).slice(0, 10).map((r, i) => {
                        const errorColor = r.error >= 0 ? "#27ae60" : "#e74c3c";
                        const apeColor = r.ape == null ? C.subText : r.ape > 20 ? "#c0392b" : r.ape > 10 ? "#e67e22" : "#27ae60";
                        return (
                          <View key={i} style={{
                            flexDirection: "row",
                            borderBottomWidth: 1,
                            borderBottomColor: "#f0f0f0",
                            paddingVertical: 6,
                          }}>
                            <Text style={{ width: 30, paddingHorizontal: 6, fontSize: 10 }}>{i + 1}</Text>
                            <Text style={{ width: 80, paddingHorizontal: 6, fontSize: 10 }}>{r.tanggal}</Text>
                            <Text style={{ width: 70, paddingHorizontal: 6, fontSize: 10, fontWeight: "700", textAlign: "right" }}>{r.aktual.toFixed(2)}</Text>
                            <Text style={{ width: 80, paddingHorizontal: 6, fontSize: 10, color: "#2980b9", textAlign: "right" }}>{r.prediksi.toFixed(2)}</Text>
                            <Text style={{ width: 90, paddingHorizontal: 6, fontSize: 10, color: errorColor, textAlign: "right" }}>{r.error >= 0 ? "+" : ""}{r.error.toFixed(2)}</Text>
                            <Text style={{ width: 70, paddingHorizontal: 6, fontSize: 10, textAlign: "right" }}>{r.abs_error.toFixed(2)}</Text>
                            <Text style={{ width: 80, paddingHorizontal: 6, fontSize: 10, textAlign: "right" }}>{r.sq_error.toFixed(2)}</Text>
                            <Text style={{ width: 70, paddingHorizontal: 6, fontSize: 10, fontWeight: "700", color: apeColor, textAlign: "right" }}>
                              {r.ape !== null ? `${r.ape.toFixed(2)}%` : "-"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <Text style={{ marginTop: 8, fontSize: 10, color: "#526273", lineHeight: 14 }}>
                    <Text style={{ fontWeight: "700" }}>Keterangan:</Text> Menampilkan 10 data pertama (aktual &gt; 0) dari total <Text style={{ fontWeight: "700" }}>{modelDetails?.n_test} hari</Text> data uji.
                    {"\n"}Rumus: Error = Aktual − Prediksi • |Error| = |Aktual − Prediksi| • APE(%) = |Error|/Aktual × 100.
                    {"\n"}| MAE = {evaluasi?.mae?.toFixed(2)} • MAPE = {evaluasi?.mape?.toFixed(2)}% • RMSE = {evaluasi?.rmse?.toFixed(2)}.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Monthly Table Component */}
          <PredictionCalculationTable rows={calculationRows} />

          {/* Footer Metrics Summary Card */}
          <View style={{
            marginHorizontal: 16,
            marginBottom: 16,
            backgroundColor: "#eaf3fc",
            borderRadius: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: "#b6d4f6",
            ...Shadow,
          }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#1e3a8a", marginBottom: 6 }}>
              Metrik Evaluasi Bulanan (Akademik &amp; Skripsi):
            </Text>
            <Text style={{ fontSize: 11, color: "#1e3a8a", lineHeight: 16 }}>
              MAE = <Text style={{ fontWeight: "700" }}>{evaluasi?.mae?.toFixed(2)}</Text> •{" "}
              MAPE = <Text style={{ fontWeight: "700", color: (evaluasi?.mape ?? 0) < 20 ? "#27ae60" : "#c0392b" }}>{evaluasi?.mape?.toFixed(2)}%</Text> •{" "}
              RMSE = <Text style={{ fontWeight: "700" }}>{evaluasi?.rmse?.toFixed(2)}</Text>
              {"\n"}n training = {modelDetails?.n_train} hari • n testing = {modelDetails?.n_test} hari
            </Text>
            <Text style={{ fontSize: 10, color: "#7f8c8d", marginTop: 8, fontStyle: "italic", lineHeight: 14 }}>
              Metrik Evaluasi Harian (Detail): MAE = {modelDetails?.mae_daily?.toFixed(2) ?? "-"} • MAPE = {modelDetails?.mape_daily?.toFixed(2) ?? "-"}% • RMSE = {modelDetails?.rmse_daily?.toFixed(2) ?? "-"} (Dipengaruhi ketiadaan aktivitas harian/nol)
            </Text>
          </View>
        </View>
      )}

      {/* 5. Saran Operasional Section */}
      {!loading && calculationRows.length > 0 && evaluasi && (
        <View style={{ marginBottom: 4 }}>
          <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
              5. Saran Operasional
            </Text>
            <Text style={{ color: C.subText, fontSize: 11, marginTop: 2 }}>
              Saran operasional untuk pemilik perusahaan berdasarkan tren hasil prediksi.
            </Text>
          </View>
          <ForecastSuggestion rows={calculationRows} evaluasi={evaluasi} />
        </View>
      )}

      {/* 6. Rekap Data / Unduh PDF Section */}
      <View style={{
        margin: 16,
        backgroundColor: C.card,
        borderRadius: Layout.radius,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
        ...Shadow,
      }}>
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 16, marginBottom: 4 }}>
          6. Rekap Laporan &amp; Unduh Laporan
        </Text>
        <Text style={{ color: C.subText, fontSize: 11, marginBottom: 12 }}>
          Unduh laporan lengkap dalam format PDF.
        </Text>

        {loading ? (
          <ActivityIndicator color={C.green} />
        ) : (
          <View style={{ gap: 8 }}>
            <InfoRow label="Total histori" value={historiCount} />
            <InfoRow label="Total prediksi" value={calculationRows.length} />
          </View>
        )}

        <TouchableOpacity
          onPress={openPdf}
          disabled={pdfLoading}
          style={{
            backgroundColor: pdfLoading ? C.mutedText : C.green,
            marginTop: 16,
            padding: 13,
            borderRadius: 7,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
            {pdfLoading ? "Membuat PDF..." : "Unduh Laporan (PDF)"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
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
  const pointWidth = pointCount > 180 ? 18 : pointCount > 90 ? 24 : 38;
  return Math.max(screenWidth - 72, pointCount * pointWidth * zoom);
}

function makeSparseLabels<T>(items: T[], formatter: (item: T, index: number) => string) {
  const step = Math.max(1, Math.ceil(items.length / 7));
  return items.map((item, index) => (index % step === 0 ? formatter(item, index) : ""));
}

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function labelBulan(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  const monthIndex = Math.max(0, Math.min(11, Number(month) - 1));
  return `${BULAN_ID[monthIndex]} ${year}`;
}

function buildCalculationRows(labels: string[], actuals: number[], preds: number[]) {
  const monthMap = new Map<string, { actual: number; prediksi: number }>();

  labels.forEach((label, index) => {
    const ym = String(label || "").slice(0, 7);
    if (!ym) return;
    const current = monthMap.get(ym) || { actual: 0, prediksi: 0 };
    current.actual += Number(actuals[index]) || 0;
    current.prediksi += Number(preds[index]) || 0;
    monthMap.set(ym, current);
  });

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, value]) => {
      const error = value.actual - value.prediksi;
      const ape = value.actual > 0 ? (Math.abs(error) / value.actual) * 100 : null;
      return {
        periode: labelBulan(ym),
        actual: Number(value.actual.toFixed(2)),
        prediksi: Number(value.prediksi.toFixed(2)),
        error: Number(error.toFixed(2)),
        ape: ape == null ? null : Number(ape.toFixed(2)),
      };
    });
}

function compactSeries(labels: string[], values: Array<number | null | undefined>) {
  return labels.reduce<{ labels: string[]; values: number[] }>((acc, label, index) => {
    const value = Number(values[index]);
    if (Number.isFinite(value) && value > 0) {
      acc.labels.push(label);
      acc.values.push(value);
    }
    return acc;
  }, { labels: [], values: [] });
}

const chartConfigBase = {
  backgroundGradientFrom: C.card,
  backgroundGradientTo: C.card,
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
};

function formatDiagnosticNumber(value?: number | null, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "-";
}

function smallStat(label: string, value: string) {
  return (
    <View style={{
      width: "47%",
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 7,
      paddingHorizontal: 10,
      paddingVertical: 9,
    }}>
      <Text style={{ color: C.mutedText, fontSize: 10, fontWeight: "700" }}>
        {label}
      </Text>
      <Text style={{ color: C.text, fontWeight: "800", marginTop: 3 }}>
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

function ChartHeader({
  title,
  subtitle,
  color,
}: {
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ color: C.text, fontWeight: "800" }}>
          {title}
        </Text>
      </View>
      <Text style={{ color: C.subText, marginTop: 3, fontSize: 12 }}>
        {subtitle}
      </Text>
    </View>
  );
}

function SeparatedLineChart({
  title,
  subtitle,
  labels,
  values,
  color,
  zoom,
}: {
  title: string;
  subtitle: string;
  labels: string[];
  values: number[];
  color: string;
  zoom: number;
}) {
  if (!labels.length || !values.length) {
    return null;
  }

  const chartLabels = makeSparseLabels(labels, label => formatDateLabel(label));

  return (
    <View style={{ marginBottom: 18 }}>
      <ChartHeader title={title} subtitle={subtitle} color={`rgb(${color})`} />
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <LineChart
          data={{
            labels: chartLabels,
            datasets: [{
              data: values,
              color: (opacity = 1) => `rgba(${color},${opacity})`,
              strokeWidth: 2.5,
            }],
          }}
          width={getChartWidth(values.length, zoom)}
          height={240}
          withDots={values.length <= 90}
          withInnerLines
          withOuterLines={false}
          withShadow={false}
          segments={4}
          yLabelsOffset={8}
          xLabelsOffset={-3}
          bezier
          chartConfig={{
            ...chartConfigBase,
            color: (opacity = 1) => `rgba(${color},${opacity})`,
            propsForDots: {
              r: "3",
              strokeWidth: "2",
              stroke: C.card,
            },
          }}
          style={{ borderRadius: Layout.radius }}
        />
      </ScrollView>
    </View>
  );
}

function ForecastDiagnosticsSection({ diagnostics }: { diagnostics: ForecastDiagnostics }) {
  const preprocessing = diagnostics.preprocessing || {};
  const adf = diagnostics.adf || {};

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: C.card,
      padding: 16,
      borderRadius: Layout.radius,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow,
    }}>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
        Diagnostik Data
      </Text>
      <Text style={{ color: C.subText, marginTop: 3, marginBottom: 12, fontSize: 12 }}>
        ACF, PACF, ADF, and preprocessing dari data histori.
      </Text>

      <CorrelationCard
        title="Grafik ACF"
        subtitle="Korelasi data dengan lag sebelumnya."
        series={diagnostics.acf}
        color={C.blue}
      />
      <CorrelationCard
        title="Grafik PACF"
        subtitle="Korelasi parsial setelah pengaruh lag lain dikontrol."
        series={diagnostics.pacf}
        color={C.green}
      />

      <View style={{
        backgroundColor: C.softCard,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
      }}>
        <Text style={{ color: C.text, fontWeight: "800", marginBottom: 4 }}>
          Hasil ADF
        </Text>
        <Text style={{ color: C.subText, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
          Uji akar unit untuk melihat stasioneritas data.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {smallStat("ADF", formatDiagnosticNumber(adf.statistic, 4))}
          {smallStat("p-value", formatDiagnosticNumber(adf.p_value, 4))}
          {smallStat("Lag", adf.lags == null ? "-" : String(adf.lags))}
          {smallStat("N", adf.nobs == null ? "-" : String(adf.nobs))}
        </View>
        <View style={{
          marginTop: 10,
          borderLeftWidth: 3,
          borderLeftColor: adf.stationary ? C.green : C.amber,
          backgroundColor: adf.stationary ? C.greenSoft : "#fff7e6",
          borderRadius: 7,
          padding: 10,
        }}>
          <Text style={{ color: adf.stationary ? C.greenDark : "#8a5a00", lineHeight: 19 }}>
            {adf.summary || "Belum ada hasil ADF."}
          </Text>
        </View>
      </View>

      <View style={{
        backgroundColor: C.softCard,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 8,
        padding: 12,
      }}>
        <Text style={{ color: C.text, fontWeight: "800", marginBottom: 4 }}>
          Preprocessing
        </Text>
        <Text style={{ color: C.subText, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
          Ringkasan data yang dipakai sebelum model berjalan.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {smallStat("Data awal", String(preprocessing.original_rows ?? 0))}
          {smallStat("Data harian", String(preprocessing.daily_rows ?? 0))}
          {smallStat("Tanggal kosong", String(preprocessing.missing_days_filled ?? 0))}
          {smallStat("Duplikat", String(preprocessing.duplicate_rows ?? 0))}
        </View>
        {(preprocessing.steps || ["Belum ada ringkasan preprocessing."]).map((step, index) => (
          <Text key={`${step}-${index}`} style={{ color: C.subText, lineHeight: 20, marginBottom: 4 }}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

function CorrelationCard({
  title,
  subtitle,
  series,
  color,
}: {
  title: string;
  subtitle: string;
  series?: DiagnosticSeries;
  color: string;
}) {
  const labels = series?.labels || [];
  const values = (series?.values || []).map(value => Number(value) || 0);
  const confidence = Number(series?.confidence);
  const maxAbs = Math.max(
    0.1,
    ...values.map(value => Math.abs(value)),
    Number.isFinite(confidence) ? Math.abs(confidence) : 0
  );

  return (
    <View style={{
      backgroundColor: C.softCard,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
    }}>
      <Text style={{ color: C.text, fontWeight: "800", marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ color: C.subText, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
        {subtitle}
      </Text>
      {values.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={{
              height: 134,
              minWidth: Math.max(screenWidth - 88, values.length * 32),
              flexDirection: "row",
              alignItems: "center",
              borderLeftWidth: 1,
              borderLeftColor: C.border,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}>
              <View style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 66,
                height: 1,
                backgroundColor: C.strongBorder,
              }} />
              {values.map((value, index) => {
                const barHeight = Math.max(2, Math.min(60, (Math.abs(value) / maxAbs) * 58));
                return (
                  <View key={`${title}-${index}`} style={{
                    width: 30,
                    height: 132,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <View style={{ height: 66, justifyContent: "flex-end" }}>
                      {value >= 0 && (
                        <View style={{ width: 10, height: barHeight, borderRadius: 4, backgroundColor: color }} />
                      )}
                    </View>
                    <View style={{ height: 66, justifyContent: "flex-start" }}>
                      {value < 0 && (
                        <View style={{ width: 10, height: barHeight, borderRadius: 4, backgroundColor: color }} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              {labels.map((label, index) => (
                <Text
                  key={`${title}-label-${index}`}
                  style={{ width: 30, color: C.mutedText, fontSize: 10, textAlign: "center" }}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <Text style={{ color: C.subText, paddingVertical: 18, textAlign: "center" }}>
          Data belum cukup untuk grafik ini.
        </Text>
      )}
    </View>
  );
}

function savePdfToAndroid(sourceUri: string, fileNameBase: string) {
  // dummy function placeholder just in case it is called
  return sourceUri;
}

function openSavedPdf(uri: string) {
  // dummy function placeholder just in case it is called
  return uri;
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.softCard,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 7,
      paddingHorizontal: 12,
      paddingVertical: 10,
    }}>
      <Text style={{ color: C.subText, fontWeight: "600" }}>
        {label}
      </Text>
      <Text style={{ color: C.text, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}
