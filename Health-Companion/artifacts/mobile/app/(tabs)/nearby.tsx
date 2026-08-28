import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

interface Place {
  id: string;
  name: string;
  type: string;
  address: string;
  distance?: number;
  lat: number;
  lon: number;
  phone?: string;
  isOpen: boolean;
}

type FilterType = "all" | "hospital" | "clinic" | "pharmacy" | "doctor";

const FILTER_OPTIONS: { label: string; value: FilterType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "All", value: "all", icon: "grid-outline" },
  { label: "Hospitals", value: "hospital", icon: "business-outline" },
  { label: "Clinics", value: "clinic", icon: "medkit-outline" },
  { label: "Pharmacies", value: "pharmacy", icon: "flask-outline" },
  { label: "Doctors", value: "doctor", icon: "person-outline" },
];

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function typeLabel(tags: Record<string, string>): string {
  if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "Hospital";
  if (tags.amenity === "clinic" || tags.healthcare === "clinic") return "Clinic";
  if (tags.amenity === "pharmacy" || tags.healthcare === "pharmacy") return "Pharmacy";
  if (tags.amenity === "doctors" || tags.amenity === "dentist" || tags.healthcare === "doctor") return "Doctor";
  return "Health Facility";
}

function matchesFilter(place: Place, filter: FilterType): boolean {
  if (filter === "all") return true;
  const t = place.type.toLowerCase();
  if (filter === "hospital") return t.includes("hospital");
  if (filter === "clinic") return t.includes("clinic");
  if (filter === "pharmacy") return t.includes("pharmacy");
  if (filter === "doctor") return t.includes("doctor") || t.includes("dentist");
  return true;
}

function typeIcon(type: string): keyof typeof Ionicons.glyphMap {
  const t = type.toLowerCase();
  if (t.includes("hospital")) return "business";
  if (t.includes("clinic")) return "medkit";
  if (t.includes("pharmacy")) return "flask";
  if (t.includes("doctor") || t.includes("dentist")) return "person";
  return "location";
}

export default function NearbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [locationName, setLocationName] = useState("Your Location");

  const topPad = Platform.OS === "web" ? 20 : insets.top;

  useEffect(() => {
    AsyncStorage.getItem("@saved_facilities").then(data => {
      if (data) setSavedIds(new Set(JSON.parse(data)));
    });
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;

      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (reverse[0]) {
          setLocationName(reverse[0].district || reverse[0].city || "Your Location");
        }
      } catch (e) {}

      const radius = 5000;
      const query = `[out:json][timeout:20];(node["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"](around:${radius},${lat},${lon});way["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist)$"](around:${radius},${lat},${lon});node["healthcare"~"^(hospital|clinic|pharmacy|doctor)$"](around:${radius},${lat},${lon}););out center 40;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query, headers: { "Content-Type": "text/plain" } });
      const json = await res.json() as any;

      const results = json.elements.map((el: any) => {
        const elLat = el.lat ?? el.center?.lat ?? 0;
        const elLon = el.lon ?? el.center?.lon ?? 0;
        const tags = el.tags ?? {};
        return {
          id: String(el.id),
          name: tags.name || typeLabel(tags),
          type: typeLabel(tags),
          address: tags["addr:street"] ? `${tags["addr:housenumber"] || ""} ${tags["addr:street"]}`.trim() : "Address not available",
          distance: distanceKm(lat, lon, elLat, elLon),
          lat: elLat,
          lon: elLon,
          phone: tags.phone,
          isOpen: Math.random() > 0.3 // Fake open status for demo
        };
      }).sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));

      setPlaces(results);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const toggleSave = async (id: string) => {
    const newSaved = new Set(savedIds);
    if (newSaved.has(id)) newSaved.delete(id);
    else newSaved.add(id);
    setSavedIds(newSaved);
    await AsyncStorage.setItem("@saved_facilities", JSON.stringify(Array.from(newSaved)));
  };

  const openDirections = (lat: number, lon: number, name: string) => {
    const url = Platform.OS === 'ios' ? `maps:0,0?q=${name}@${lat},${lon}` : `geo:0,0?q=${lat},${lon}(${name})`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`));
  };

  const filteredPlaces = places.filter(p => matchesFilter(p, filter));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Nearby Care</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{locationName}</Text>
        </View>
        <Pressable style={[styles.ambulanceBtn, { backgroundColor: colors.riskEmergency }]} onPress={() => Linking.openURL("tel:10177")}>
          <Ionicons name="medical" size={20} color="#fff" />
          <Text style={styles.ambulanceBtnText}>Request Ambulance</Text>
        </Pressable>
      </View>

      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={item => item.value}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, { backgroundColor: filter === item.value ? colors.primary : colors.card, borderColor: filter === item.value ? colors.primary : colors.border }]}
              onPress={() => setFilter(item.value)}
            >
              <Ionicons name={item.icon} size={16} color={filter === item.value ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.filterText, { color: filter === item.value ? colors.primaryForeground : colors.foreground }]}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Locating facilities...</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No facilities found</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Try expanding your search or selecting a different category.</Text>
          <Pressable style={[styles.refreshBtn, { backgroundColor: colors.secondary }]} onPress={fetchPlaces}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardMain}>
                <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                  <Ionicons name={typeIcon(item.type)} size={24} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.badgesRow}>
                    <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.type}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: item.isOpen ? colors.riskLow + '20' : colors.riskMedium + '20' }]}>
                      <Text style={[styles.badgeText, { color: item.isOpen ? colors.riskLow : colors.riskMedium }]}>{item.isOpen ? "Open" : "Closed"}</Text>
                    </View>
                    {item.distance && (
                      <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{item.distance.toFixed(1)} km</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>{item.address}</Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => openDirections(item.lat, item.lon, item.name)}>
                  <Ionicons name="navigate" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Directions</Text>
                </Pressable>
                <Pressable style={[styles.iconAction, { backgroundColor: colors.secondary }]} onPress={() => toggleSave(item.id)}>
                  <Ionicons name={savedIds.has(item.id) ? "bookmark" : "bookmark-outline"} size={20} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, gap: 8 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  ambulanceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  ambulanceBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  filtersWrapper: { paddingVertical: 12 },
  filtersList: { paddingHorizontal: 16, gap: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  listContent: { padding: 16, gap: 16, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  cardMain: { flexDirection: "row", gap: 12, alignItems: "center" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1, gap: 6 },
  cardName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  badgesRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  address: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  iconAction: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  loadingText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  refreshText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});