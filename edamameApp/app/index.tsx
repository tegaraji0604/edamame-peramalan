import { useState } from "react";
import { Image, Linking, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors, Shadow } from "@/constants/theme";

const C = Colors.light;
const EDAMAME_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Edamame.jpg/500px-Edamame.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Edamame_in_a_tray.jpg/960px-Edamame_in_a_tray.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Edamame_%289636180297%29.jpg/960px-Edamame_%289636180297%29.jpg",
];
const MAP_URL = "https://maps.google.com/?q=Grolia+Edamame+Malang";

export default function WelcomeScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width - 48, 360);

  const handleSlide = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextSlide = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveSlide(nextSlide);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#1b2b3a", "#1e3248", "#1a2c3e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>
          Selamat Datang
        </Text>

        <Text style={styles.heroSubtitle}>
          Sistem Peramalan Produksi Edamame Berbasis Data
        </Text>

        <TouchableOpacity onPress={() => router.push("/login")} style={styles.heroButton}>
          <Text style={styles.heroButtonText}>
            Masuk Dashboard
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <Section title="Apa itu Edamame?" background="#ffffff">
        <Text style={styles.paragraph}>
          Edamame secara alami bebas gluten dan rendah kalori, tidak mengandung kolesterol dan merupakan sumber yang sangat baik dari protein, zat besi, dan kalsium.
        </Text>
        <Text style={styles.paragraph}>
          Banyak penelitian menunjukkan bahwa peningkatan konsumsi makanan nabati seperti edamame dapat membantu mendukung kesehatan tubuh dan meningkatkan energi.
        </Text>
        <Text style={styles.paragraph}>
          Isoflavon dalam edamame telah dikaitkan dengan penurunan risiko osteoporosis, sedangkan kalsium dan magnesium di dalamnya dapat membantu menjaga keseimbangan gula darah.
        </Text>
      </Section>

      <View style={styles.carouselSection}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.carouselWrap}
          onMomentumScrollEnd={handleSlide}
        >
          {EDAMAME_IMAGES.map((image, item) => (
            <Image
              key={image}
              source={{ uri: image }}
              style={[styles.carouselImage, { width: slideWidth }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {EDAMAME_IMAGES.map((image, item) => (
            <View
              key={image}
              style={[styles.dot, activeSlide === item && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      <Section title="Tujuan Website" background="#f5f6f8">
        <View style={styles.goalCard}>
          <Text style={styles.paragraph}>
            Tujuan utama dari pengembangan sistem ini adalah membangun platform peramalan penjualan berbasis web yang interaktif dan mudah digunakan oleh manajemen PT AGRAPANA FOOD JAYA.
          </Text>
          <Text style={styles.paragraph}>
            Sistem ini mengolah data historis penjualan edamame menggunakan algoritma Seasonal ARIMA dengan Variabel Eksogen (ARIMAX), sehingga manajemen dapat melihat proyeksi penjualan secara visual dan real-time.
          </Text>
          <Text style={[styles.paragraph, styles.lastParagraph]}>
            Dengan mengintegrasikan variabel seperti hari libur nasional dan frekuensi pengiriman, sistem membantu perusahaan membuat keputusan stok yang lebih terukur.
          </Text>
        </View>
      </Section>

      <Section title="PT AGRAPANA FOOD JAYA" background="#f5f6f8">
        <View style={styles.companyCard}>
          <View style={styles.companyTop}>
            <Text style={styles.companyText}>
              <Text style={styles.companyStrong}>PT AGRAPANA FOOD JAYA</Text> merupakan perusahaan yang bergerak di bidang pengolahan dan distribusi produk pangan, khususnya edamame. Perusahaan ini berkomitmen menyediakan produk berkualitas tinggi serta mendukung inovasi produksi berbasis teknologi cerdas.
            </Text>
          </View>

          <View style={styles.companyBottom}>
            <Text style={styles.locationTitle}>Lokasi Kami</Text>
            <Text style={styles.addressTitle}>Kantor & Gudang:</Text>
            <Text style={styles.addressText}>
              Perumahan Kalila Residence Blok E8{"\n"}
              Jl. Ikan Tombro Barat, Kel. Tunjungsegar{"\n"}
              Kec. Lowokwaru, Kota Malang{"\n"}
              Provinsi Jawa Timur, ID, 65118
            </Text>

            <TouchableOpacity onPress={() => Linking.openURL(MAP_URL)} style={styles.mapButton}>
              <Text style={styles.mapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  background,
  children,
}: {
  title: string;
  background: string;
  children: import("react").ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: background }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionDivider} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },
  content: {
    paddingBottom: 0,
  },
  hero: {
    minHeight: 240,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: "#ffffff",
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
    marginBottom: 12,
    textAlign: "center",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    textAlign: "center",
  },
  heroButton: {
    backgroundColor: C.green,
    borderRadius: 6,
    paddingHorizontal: 30,
    paddingVertical: 12,
    ...Shadow,
  },
  heroButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  sectionTitle: {
    color: "#1e2d3e",
    fontFamily: "serif",
    fontSize: 25,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  sectionDivider: {
    alignSelf: "center",
    backgroundColor: C.green,
    borderRadius: 2,
    height: 3,
    marginBottom: 28,
    width: 44,
  },
  paragraph: {
    color: "#444444",
    fontSize: 14,
    lineHeight: 25,
    marginBottom: 14,
    textAlign: "justify",
  },
  lastParagraph: {
    marginBottom: 0,
  },
  carouselSection: {
    backgroundColor: "#f5f6f8",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  carouselWrap: {
    alignSelf: "center",
    borderRadius: 8,
    maxWidth: 360,
    overflow: "hidden",
    width: "100%",
    ...Shadow,
  },
  carouselImage: {
    height: 220,
    width: 360,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 14,
  },
  dot: {
    backgroundColor: "#c0c9d4",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: C.green,
    width: 22,
  },
  goalCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8ef",
    borderLeftColor: "#6ab04c",
    borderLeftWidth: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    ...Shadow,
  },
  companyCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dde4ed",
    borderRadius: 6,
    borderTopColor: "#6ab04c",
    borderTopWidth: 3,
    borderWidth: 1,
    overflow: "hidden",
    ...Shadow,
  },
  companyTop: {
    borderBottomColor: "#edf0f4",
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  companyText: {
    color: "#444444",
    fontSize: 14,
    lineHeight: 25,
    textAlign: "center",
  },
  companyStrong: {
    color: "#1e2d3e",
    fontWeight: "800",
  },
  companyBottom: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  locationTitle: {
    color: "#1e2d3e",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  addressTitle: {
    color: "#1e2d3e",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  addressText: {
    color: "#555555",
    fontSize: 13,
    lineHeight: 22,
  },
  mapButton: {
    alignSelf: "flex-start",
    marginTop: 14,
  },
  mapButtonText: {
    color: "#2980b9",
    fontSize: 13,
    fontWeight: "700",
  },
});
