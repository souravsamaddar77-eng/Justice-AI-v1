"use client";

import { useEffect, useState } from "react";
import { MapPin, Download, Navigation, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { legalAidClinics, findNearestClinics, type LegalAidClinic } from "@/lib/legal-aid-data";

export default function LegalAid() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestClinics, setNearestClinics] = useState<LegalAidClinic[]>([]);
  const [status, setStatus] = useState<"idle" | "locating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }

    setStatus("locating");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        const nearest = findNearestClinics(coords.lat, coords.lng, 3);
        setNearestClinics(nearest);
        setStatus("success");
      },
      (err) => {
        setStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErrorMessage("Location access denied. Please enable location permissions or enter a city manually.");
            break;
          case err.POSITION_UNAVAILABLE:
            setErrorMessage("Location information unavailable. Please try again.");
            break;
          case err.TIMEOUT:
            setErrorMessage("Location request timed out. Please try again.");
            break;
          default:
            setErrorMessage("An unknown error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCitySelect = (city: string) => {
    // Demo: predefined coordinates for major WB cities
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      kolkata: { lat: 22.5726, lng: 88.3639 },
      howrah: { lat: 22.5958, lng: 88.2636 },
      "north 24 parganas": { lat: 22.7758, lng: 88.3917 },
      "south 24 parganas": { lat: 22.1667, lng: 88.3667 },
      hooghly: { lat: 22.905, lng: 88.395 },
      "paschim medinipur": { lat: 22.4167, lng: 87.3333 },
      "purba medinipur": { lat: 22.0833, lng: 87.75 },
      bardhaman: { lat: 23.25, lng: 87.85 },
      birbhum: { lat: 23.9167, lng: 87.5333 },
      bankura: { lat: 23.2333, lng: 87.0667 },
      purulia: { lat: 23.3333, lng: 86.3667 },
      malda: { lat: 25.0, lng: 88.1333 },
      "uttar dinajpur": { lat: 25.8167, lng: 88.1 },
      "dakshin dinajpur": { lat: 25.4167, lng: 88.55 },
      jalpaiguri: { lat: 26.5167, lng: 88.7333 },
      alipurduar: { lat: 26.4833, lng: 89.5333 },
      coochbehar: { lat: 26.3167, lng: 89.45 },
      darjeeling: { lat: 27.041, lng: 88.2663 },
      kalimpong: { lat: 27.0667, lng: 88.4667 },
    };

    const coords = cityCoords[city.toLowerCase()];
    if (coords) {
      setUserLocation(coords);
      const nearest = findNearestClinics(coords.lat, coords.lng, 3);
      setNearestClinics(nearest);
      setStatus("success");
      setErrorMessage("");
    }
  };

  const wbCities = [
    "Kolkata",
    "Howrah",
    "North 24 Parganas",
    "South 24 Parganas",
    "Hooghly",
    "Paschim Medinipur",
    "Purba Medinipur",
    "Bardhaman",
    "Birbhum",
    "Bankura",
    "Purulia",
    "Malda",
    "Uttar Dinajpur",
    "Dakshin Dinajpur",
    "Jalpaiguri",
    "Alipurduar",
    "Cooch Behar",
    "Darjeeling",
    "Kalimpong",
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-300 shrink-0">
          <MapPin className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Free Legal Aid Clinics</h2>
          <p className="mt-1 text-sm text-navy-500">
            Locate your nearest law-school legal aid clinic. Brainware University (Kolkata) is the first clinic in our
            network — more colleges coming soon.
          </p>
        </div>
      </div>

      {/* Location Finder */}
      <div className="card-surface p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-navy-700 mb-2">
            Find clinics near you
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={requestLocation}
              disabled={status === "locating"}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-medium text-navy-700 hover:border-gold-400 hover:bg-gold-50/50 focus:outline-none focus:ring-2 focus:ring-gold-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "locating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Locating…
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Use My Location
                </>
              )}
            </button>
            <div className="relative flex-1 min-w-[180px]">
              <select
                onChange={(e) => handleCitySelect(e.target.value)}
                disabled={status === "locating"}
                className="w-full rounded-xl border border-navy-200 px-4 py-2.5 text-sm text-navy-700 bg-white focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200 appearance-none pr-10"
              >
                <option value="">— Or select a city —</option>
                {wbCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-navy-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {status === "error" && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {status === "success" && userLocation && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Found your location ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}). Showing nearest
                clinics:
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {nearestClinics.length > 0 ? (
          <div className="space-y-4">
            {nearestClinics.map((clinic) => (
              <div
                key={clinic.id}
                className="card-surface border border-navy-100 rounded-xl p-4 hover:border-gold-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-navy-900 truncate">{clinic.name}</h3>
                      {clinic.distance !== undefined && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-medium text-gold-700">
                          <MapPin className="h-3 w-3" />
                          {clinic.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-navy-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {clinic.address}, {clinic.city} - {clinic.pincode}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {clinic.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {clinic.email}
                      </span>
                    </div>
                  </div>

                  {/* PDF Download Buttons */}
                  <div className="flex flex-wrap gap-2 md:ml-4 md:flex-shrink-0">
                    {clinic.pdfs.form && (
                      <a
                        href={clinic.pdfs.form}
                        download
                        className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 hover:border-gold-400 hover:bg-gold-50/50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Application Form
                      </a>
                    )}
                    {clinic.pdfs.handbook && (
                      <a
                        href={clinic.pdfs.handbook}
                        download
                        className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 hover:border-gold-400 hover:bg-gold-50/50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Rights Handbook
                      </a>
                    )}
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${clinic.lat},${clinic.lng}`, "_blank")}
                      className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 hover:border-gold-400 hover:bg-gold-50/50 transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                      Directions
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : status === "idle" ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-navy-200" />
            <p className="mt-3 text-navy-500">Click "Use My Location" or select a city to find nearby clinics</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-400" />
            <p className="mt-3 text-navy-500">No legal aid clinics found near this location yet</p>
            <p className="mt-1 text-sm text-navy-400">More colleges are being added to the network</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="card-surface border border-navy-100 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700 shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="text-sm text-navy-600">
            <p className="font-medium text-navy-900 mb-1">About Legal Aid Clinics</p>
            <p className="mb-2">
              Law colleges across India run free legal aid clinics staffed by law students under faculty supervision. They
              provide free legal advice, help with drafting applications, and guidance on rights.
            </p>
            <ul className="list-disc list-inside space-y-1 text-navy-500">
              <li>Free legal consultation for eligible persons</li>
              <li>Assistance with legal documents and forms</li>
              <li>Referral to panel advocates for court representation</li>
              <li>Legal literacy and rights awareness programs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}