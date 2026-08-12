// ─────────────────────────────────────────────────────────────
//  Legal Aid Clinic dataset — Law colleges with GPS coordinates
//  ⚠️ DEMO DATASET — initial entry for Brainware University (Kolkata)
//  ─────────────────────────────────────────────────────────────

export interface LegalAidClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  lat: number;
  lng: number;
  distance?: number; // km from user, populated at runtime
  pdfs: {
    form?: string; // path to legal aid application form
    handbook?: string; // path to rights handbook
  };
}

export const legalAidClinics: LegalAidClinic[] = [
  {
    id: "brainware-university",
    name: "Brainware University — Legal Aid Clinic",
    address: "398, Ramkrishnapur, Barasat, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700124",
    phone: "+91 33 2584 0000",
    email: "legalaid@brainwareuniversity.ac.in",
    lat: 22.7268,
    lng: 88.4804,
    pdfs: {
      form: "/legal-aid/brainware/brainware-legal-aid-form.pdf",
      handbook: "/legal-aid/brainware/brainware-rights-handbook.pdf",
    },
  },
];

/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find nearest clinics to a user location, sorted by distance.
 */
export function findNearestClinics(userLat: number, userLng: number, limit = 5): LegalAidClinic[] {
  return legalAidClinics
    .map((clinic) => ({
      ...clinic,
      distance: haversineDistance(userLat, userLng, clinic.lat, clinic.lng),
    }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, limit);
}