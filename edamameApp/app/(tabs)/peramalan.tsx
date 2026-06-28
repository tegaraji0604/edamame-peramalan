import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { fetchJson } from "@/constants/api";
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

export default function ForecastScreen() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedHorizon, setSelectedHorizon] = useState(30);

  const [actual, setActual] = useState<number[]>([]);
  const [actualLabels, setActualLabels] = useState<string[]>([]);
  const [uji, setUji] = useState<number[]>([]);
  const [ujiLabels, setUjiLabels] = useState<string[]>([]);
  const [forecast, setForecast] = useState<number[]>([]);
  const [forecastLabels, setForecastLabels] = useState<string[]>([]);
  const [forecastDaily, setForecastDaily] = useState<number[]>([]);
  const [forecastDailyLabels, setForecastDailyLabels] = useState<string[]>([]);
  const [calculationRows, setCalculationRows] = useState<CalculationRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<ForecastDiagnostics | null>(null);

  const [evalData, setEvalData] = useState({
    mae: 0,
    mape: 0,
    rmse: 0,
    mae_percent: 0,
    rmse_percent: 0,
    avg_actual: 0,
  });

  useEffect(() => {
    loadForecast(selectedHorizon);
  }, [selectedHorizon]);

  const loadForecast = async (horizon: number) => {
    try {
      setLoading(true);

      const pred = await fetchJson(`/api/peramalan?horizon=${horizon}`);

      setOnline(true);

      setEvalData({
        mae: Number(pred?.mae) || 0,
        mape: Number(pred?.mape) || 0,
        rmse: Number(pred?.rmse) || 0,
        mae_percent: Number(pred?.mae_percent) || 0,
        rmse_percent: Number(pred?.rmse_percent) || 0,
        avg_actual: Number(pred?.avg_actual) || 0,
      });

      const actVals = (pred?.act_vals || []) as number[];
      const actLabelsRaw = (pred?.act_labels || []) as string[];
      const ujiVals = (pred?.uji_vals || []) as Array<number | null>;
      const fcVals = (pred?.fc_vals || []) as number[];
      const fcLabelsRaw = (pred?.fc_labels || []) as string[];
      const fcDailyVals = (pred?.fc_vals_daily || []) as number[];
      const fcDailyLabelsRaw = (pred?.fc_labels_daily || []) as string[];
      const compactUji = compactSeries(actLabelsRaw, ujiVals);

      setActual(actVals.map(Number));
      setActualLabels(actLabelsRaw);
      setUji(compactUji.values);
      setUjiLabels(compactUji.labels);
      setForecast(fcVals.map(Number));
      setForecastLabels(fcLabelsRaw);
      setForecastDaily(fcDailyVals.map(Number));
      setForecastDailyLabels(fcDailyLabelsRaw);

      setCalculationRows(buildCalculationRows(
        (pred?.test_labels_daily || []) as string[],
        (pred?.test_actuals_daily || []) as number[],
        (pred?.test_preds_daily || []) as number[],
      ));
      setDiagnostics(pred?.diagnostics || null);
    } catch (e) {
      console.log("PERAMALAN ERROR:", e);
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
    } finally {
      setLoading(false);
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
          marginBottom: 10,
        }}>
          <Text style={{ color: "#fff", fontSize: 19, fontWeight: "800" }}>
            Peramalan
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
        <Text style={{ color: "#dbe4ee", lineHeight: 20 }}>
          Pilih periode prediksi yang sudah diproses dari web.
        </Text>
      </View>

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

      {/* Evaluasi Model Section (Gambar 1 style) */}
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
              Evaluasi Model
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
              {evalData.mae_percent ? `${evalData.mae_percent.toFixed(2)}%` : "-%"}
            </Text>
            <Text style={{ color: "#526273", fontSize: 10, fontWeight: "800", marginTop: 4 }}>
              MAE
            </Text>
            <Text style={{ color: "#7f8c8d", fontSize: 10, marginTop: 2 }}>
              ({evalData.mae ? `${evalData.mae.toFixed(2)} unit` : "-"})
            </Text>
            <View style={{
              marginTop: 8,
              backgroundColor: evalData.mae_percent < 10 ? "#eafaf1" : evalData.mae_percent <= 20 ? "#fffbee" : "#fff5f5",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
            }}>
              <Text style={{
                color: evalData.mae_percent < 10 ? "#27ae60" : evalData.mae_percent <= 20 ? "#e67e22" : "#c0392b",
                fontSize: 9,
                fontWeight: "700",
              }}>
                {evalData.mae_percent < 10 ? "✓ Baik" : evalData.mae_percent <= 20 ? "⚠ Cukup" : "✗ Tinggi"}
              </Text>
            </View>
          </View>

          {/* MAPE */}
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#27ae60", fontSize: 20, fontWeight: "800" }}>
              {evalData.mape ? `${evalData.mape.toFixed(2)}%` : "-%"}
            </Text>
            <Text style={{ color: "#526273", fontSize: 10, fontWeight: "800", marginTop: 4 }}>
              MAPE
            </Text>
            <Text style={{ color: "#7f8c8d", fontSize: 10, marginTop: 2 }}>
              (target &lt; 20%)
            </Text>
            <View style={{
              marginTop: 8,
              backgroundColor: evalData.mape < 10 ? "#eafaf1" : evalData.mape <= 20 ? "#eefaf3" : evalData.mape <= 50 ? "#fffbee" : "#fff5f5",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
            }}>
              <Text style={{
                color: evalData.mape < 10 ? "#27ae60" : evalData.mape <= 20 ? "#16a085" : evalData.mape <= 50 ? "#e67e22" : "#c0392b",
                fontSize: 9,
                fontWeight: "700",
              }}>
                {evalData.mape < 10 ? "✓ Sangat Baik" : evalData.mape <= 20 ? "✓ Baik" : evalData.mape <= 50 ? "⚠ Cukup" : "✗ Buruk"}
              </Text>
            </View>
          </View>

          {/* RMSE */}
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#e74c3c", fontSize: 20, fontWeight: "800" }}>
              {evalData.rmse_percent ? `${evalData.rmse_percent.toFixed(2)}%` : "-%"}
            </Text>
            <Text style={{ color: "#526273", fontSize: 10, fontWeight: "800", marginTop: 4 }}>
              RMSE
            </Text>
            <Text style={{ color: "#7f8c8d", fontSize: 10, marginTop: 2 }}>
              ({evalData.rmse ? `${evalData.rmse.toFixed(2)} unit` : "-"})
            </Text>
            <View style={{
              marginTop: 8,
              backgroundColor: evalData.rmse_percent < 10 ? "#eafaf1" : evalData.rmse_percent <= 20 ? "#eefaf3" : "#fff5f5",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
            }}>
              <Text style={{
                color: evalData.rmse_percent < 10 ? "#27ae60" : evalData.rmse_percent <= 20 ? "#16a085" : "#c0392b",
                fontSize: 9,
                fontWeight: "700",
              }}>
                {evalData.rmse_percent < 10 ? "✓ Sangat Baik" : evalData.rmse_percent <= 20 ? "✓ Baik" : "✗ Perlu Opt."}
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
            ℹ️ <Text style={{ fontWeight: "700" }}>Keterangan:</Text> MAE dan RMSE ditampilkan sebagai persentase terhadap rata-rata data uji agar lebih mudah diinterpretasikan. Nilai asli tetap tersedia dalam satuan penjualan (unit). Rata-rata data uji: <Text style={{ fontWeight: "700" }}>{evalData.avg_actual ? evalData.avg_actual.toFixed(2) : "-"} unit</Text>.
          </Text>
        </View>
      </View>

      {!loading && diagnostics && (
        <ForecastDiagnosticsSection diagnostics={diagnostics} />
      )}

      {!loading && calculationRows.length > 0 && (
        <>
          <PredictionCalculationTable rows={calculationRows} />
          <ForecastSuggestion rows={calculationRows} evaluasi={evalData} />
        </>
      )}

      {loading && (
        <ActivityIndicator size="large" color={C.green} style={{ marginTop: 24 }} />
      )}

      {!loading && actual.length > 0 && (
        <View style={{
          margin: 16,
          backgroundColor: C.card,
          padding: 16,
          borderRadius: Layout.radius,
          borderWidth: 1,
          borderColor: C.border,
          ...Shadow,
        }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 12,
          }}>
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
    </ScrollView>
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
        ACF, PACF, ADF, dan preprocessing dari data histori.
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

function formatDiagnosticNumber(value?: number | null, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "-";
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

function metricCard(title: string, value?: number, suffix = "") {
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.card,
      padding: 12,
      borderRadius: Layout.radius,
      borderWidth: 1,
      borderColor: C.border,
      ...SoftShadow,
    }}>
      <Text style={{ color: C.subText, fontSize: 11, fontWeight: "700" }}>
        {title}
      </Text>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 16, marginTop: 4 }}>
        {value == null ? "-" : `${Number(value).toFixed(2)}${suffix}`}
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
