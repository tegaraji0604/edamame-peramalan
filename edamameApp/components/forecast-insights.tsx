import { ScrollView, Text, View } from "react-native";
import { Colors, Layout, Shadow, SoftShadow } from "@/constants/theme";

const C = Colors.light;

export type ForecastRow = {
  tanggal?: string;
  prediksi?: number;
};

export type CalculationRow = {
  periode: string;
  actual: number;
  prediksi: number;
  error: number;
  ape: number | null;
};

type Evaluasi = {
  mae?: number;
  mape?: number;
  rmse?: number;
};

function formatNumber(value: number, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0";
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getTrendPercent(rows: CalculationRow[]) {
  if (rows.length < 2) return 0;

  const windowSize = Math.min(7, Math.floor(rows.length / 2));
  if (windowSize < 1) return 0;

  const startAvg = average(rows.slice(0, windowSize).map(row => row.prediksi));
  const endAvg = average(rows.slice(-windowSize).map(row => row.prediksi));

  if (startAvg <= 0) return 0;
  return ((endAvg - startAvg) / startAvg) * 100;
}

function getCalculationStats(rows: CalculationRow[]) {
  const values = rows.map(row => row.prediksi).filter(value => value > 0);
  const actualValues = rows.map(row => row.actual).filter(value => value > 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const avg = values.length ? total / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const actualAvg = average(actualValues);
  const avgApe = average(rows.map(row => row.ape ?? 0).filter(value => value > 0));

  return { total, avg, min, max, actualAvg, avgApe, trendPercent: getTrendPercent(rows) };
}

function getAccuracyText(mape?: number) {
  const value = Number(mape) || 0;

  if (value <= 10) {
    return "Akurasi model sangat baik. Prediksi bisa dipakai sebagai acuan utama untuk menyiapkan stok dan jadwal produksi.";
  }

  if (value <= 20) {
    return "Akurasi model masih baik. Gunakan prediksi sebagai acuan utama, lalu beri ruang penyesuaian kecil untuk hari libur, jeda panen, dan perubahan permintaan mendadak.";
  }

  return "Akurasi model perlu diawasi. Gunakan prediksi sebagai gambaran tren, tetapi keputusan stok sebaiknya tetap dikombinasikan dengan kondisi lapangan terbaru.";
}

function getTrendAdvice(rows: CalculationRow[]) {
  const trendPercent = getTrendPercent(rows);

  if (trendPercent > 8) {
    return `Tren validasi prediksi naik sekitar ${formatNumber(trendPercent, 1)}%. Siapkan stok dan kapasitas produksi lebih awal saat pola serupa muncul.`;
  }

  if (trendPercent < -8) {
    return `Tren validasi prediksi turun sekitar ${formatNumber(Math.abs(trendPercent), 1)}%. Jaga stok tetap ramping supaya risiko sisa produk lebih kecil.`;
  }

  return "Tren validasi prediksi relatif stabil. Pertahankan pola produksi harian, lalu pantau selisih aktual dan prediksi pada pekan berjalan.";
}

export function ForecastSuggestion({
  rows,
  evaluasi,
}: {
  rows: CalculationRow[];
  evaluasi: Evaluasi;
}) {
  const stats = getCalculationStats(rows);
  const accuracyGap = stats.actualAvg > 0 ? ((stats.avg - stats.actualAvg) / stats.actualAvg) * 100 : 0;

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: C.card,
      borderRadius: Layout.radius,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      ...Shadow,
    }}>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 15, marginBottom: 8 }}>
        Saran
      </Text>
      <Text style={{ color: C.subText, lineHeight: 21 }}>
        {getAccuracyText(evaluasi?.mape)}
      </Text>
      <Text style={{ color: C.subText, lineHeight: 21, marginTop: 8 }}>
        {getTrendAdvice(rows)}
      </Text>
      <Text style={{ color: C.subText, lineHeight: 21, marginTop: 8 }}>
        {Math.abs(accuracyGap) <= 10
          ? "Rata-rata prediksi validasi dekat dengan aktual, jadi saran stok bisa mengikuti ritme produksi normal."
          : accuracyGap > 10
            ? `Prediksi validasi lebih tinggi ${formatNumber(accuracyGap, 1)}% dari aktual. Hindari menambah stok berlebihan tanpa konfirmasi permintaan lapangan.`
            : `Prediksi validasi lebih rendah ${formatNumber(Math.abs(accuracyGap), 1)}% dari aktual. Siapkan cadangan stok saat realisasi mulai melampaui prediksi.`}
      </Text>
      <View style={{
        backgroundColor: C.greenSoft,
        borderColor: C.green,
        borderWidth: 1,
        borderRadius: 7,
        padding: 10,
        marginTop: 12,
      }}>
        <Text style={{ color: C.greenDark, fontWeight: "800" }}>
          Rata-rata prediksi validasi: {formatNumber(stats.avg)} kg
        </Text>
      </View>
    </View>
  );
}

export function PredictionCalculationTable({ rows }: { rows: CalculationRow[] }) {
  const stats = getCalculationStats(rows);

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: C.card,
      borderRadius: Layout.radius,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      ...Shadow,
    }}>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
        Tabel Perhitungan Prediksi
      </Text>
      <Text style={{ color: C.subText, marginTop: 3, marginBottom: 12, fontSize: 12 }}>
        Hasil evaluasi model ARIMAX pada periode data uji, sama seperti tabel web.
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <SummaryPill label="Min" value={`${formatNumber(stats.min)} kg`} />
        <SummaryPill label="Rata-rata" value={`${formatNumber(stats.avg)} kg`} />
        <SummaryPill label="Maks" value={`${formatNumber(stats.max)} kg`} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ minWidth: 510 }}>
          <View style={[tableStyles.row, tableStyles.header]}>
            <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 44 }]}>No</Text>
            <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 132 }]}>Periode</Text>
            <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 112 }]}>Data Aktual</Text>
            <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 126 }]}>Prediksi ARIMAX</Text>
            <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 112 }]}>Error</Text>
            <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 92 }]}>APE</Text>
          </View>

          {rows.map((item, index) => {
            const errorColor = item.error >= 0 ? C.green : C.red;
            const apeColor = item.ape == null
              ? C.subText
              : item.ape > 20
                ? C.red
                : item.ape > 10
                  ? C.amber
                  : C.green;

            return (
              <View
                key={`${item.periode}-${index}`}
                style={[
                  tableStyles.row,
                  { backgroundColor: index % 2 === 0 ? C.card : C.softCard },
                ]}
              >
                <Text style={[tableStyles.cell, { width: 44 }]}>{index + 1}</Text>
                <Text style={[tableStyles.cell, tableStyles.strong, { width: 132 }]}>{item.periode}</Text>
                <Text style={[tableStyles.cell, tableStyles.strong, { width: 112 }]}>
                  {formatNumber(item.actual, 2)}
                </Text>
                <Text style={[tableStyles.cell, { width: 126, color: C.blue, fontWeight: "800" }]}>
                  {formatNumber(item.prediksi, 2)}
                </Text>
                <Text style={[tableStyles.cell, { width: 112, color: errorColor }]}>
                  {item.error >= 0 ? "+" : ""}{formatNumber(item.error, 2)}
                </Text>
                <Text style={[tableStyles.cell, { width: 92, color: apeColor, fontWeight: "700" }]}>
                  {item.ape == null ? "-" : `${formatNumber(item.ape, 2)}%`}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.softCard,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 7,
      padding: 10,
      ...SoftShadow,
    }}>
      <Text style={{ color: C.subText, fontSize: 10, fontWeight: "700" }}>
        {label}
      </Text>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: "800", marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const tableStyles = {
  row: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  header: {
    backgroundColor: C.primary,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  headerCell: {
    color: "#fff",
    fontWeight: "800" as const,
  },
  cell: {
    color: C.subText,
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 10,
  },
  strong: {
    color: C.text,
    fontWeight: "800" as const,
  },
};
