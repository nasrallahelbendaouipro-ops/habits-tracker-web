/**
 * Google Health Connect integration (Android) / Apple HealthKit (iOS)
 *
 * Architecture: Device → Health Aggregator (HealthKit/Health Connect) → App
 *
 * Google Health Connect REST API: https://health.google.com/health-connect/
 * Requires: GOOGLE_HEALTH_CLIENT_ID + GOOGLE_HEALTH_CLIENT_SECRET in .env.local
 *
 * Apple HealthKit: Only accessible via native iOS app (React Native / Capacitor).
 * Web apps cannot access HealthKit directly. Future: wrap in Capacitor.
 */

export type HealthMetric = {
  date: string;       // YYYY-MM-DD
  steps?: number;
  calories_burned?: number;
  heart_rate_avg?: number;
  hrv?: number;
  sleep_duration_min?: number;
  sleep_quality?: number;  // 0–100
  active_minutes?: number;
  distance_km?: number;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  type: 'apple_health' | 'google_health_connect' | 'garmin' | 'fitbit' | 'whoop' | 'oura';
  connected: boolean;
  last_synced?: string;
};

/** Returns the Google Health Connect OAuth URL */
export function getHealthConnectAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_HEALTH_CLIENT_ID ?? '';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/auth/health-connect/callback`;
  const scope = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.body.read',
  ].join(' ');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
}

/** Placeholder: fetch today's metrics from Health Connect after OAuth */
export async function fetchHealthConnectMetrics(
  accessToken: string,
  date: string
): Promise<HealthMetric> {
  // TODO: implement Google Fitness REST API calls
  // GET https://www.googleapis.com/fitness/v1/users/me/dataSources
  // Authorization: Bearer {accessToken}
  void accessToken;
  void date;
  return { date };
}
