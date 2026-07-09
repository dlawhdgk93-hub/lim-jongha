import { Linking, Platform } from 'react-native';
import type { ContactInfo, LocationInfo } from '../types/schedule';

export function buildTelUrl(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}

export function buildMapsUrl(location: LocationInfo): string {
  if (location.lat && location.lng) {
    const coords = `${location.lat},${location.lng}`;
    return Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(location.place_name ?? coords)}@${coords}`,
      android: `geo:${coords}?q=${coords}(${encodeURIComponent(location.place_name ?? '목적지')})`,
      default: `https://www.google.com/maps/search/?api=1&query=${coords}`,
    }) as string;
  }

  const query = encodeURIComponent(location.address ?? location.place_name ?? '');
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export async function openPhone(contact: ContactInfo) {
  if (!contact.phone) return false;
  await Linking.openURL(buildTelUrl(contact.phone));
  return true;
}

export async function openMaps(location: LocationInfo) {
  await Linking.openURL(buildMapsUrl(location));
}
