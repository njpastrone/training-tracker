import { requireOptionalNativeModule } from 'expo';

// What ios/LiftTextPlacesModule.swift finds with Apple Maps on the iPhone (services/finder.ts). The
// coordinates stay on the phone: the Worker takes names, kinds and distance buckets only.
export interface NearbyPlace {
  name: string;
  category: string; // MKPointOfInterestCategory raw value ("MKPOICategoryRestaurant"), or ''
  distanceM: number;
  lat: number;
  lon: number;
}
export interface Point {
  lat: number;
  lon: number;
}

// Null in Expo Go, where only a typed area with no place list works.
export default requireOptionalNativeModule<{
  currentLocation(): Promise<Point | null>; // asks for approximate When In Use permission the first time
  locationPermission(): 'notDetermined' | 'allowed' | 'denied';
  geocode(text: string): Promise<(Point & { name: string }) | null>;
  nearby(lat: number, lon: number, radiusM: number): Promise<NearbyPlace[]>;
}>('LiftTextPlaces');
