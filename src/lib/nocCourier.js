/**
 * NOC Express Courier API Helper Module (Disabled)
 */

export const NOC_PORTALS = [
  { id: 'portal_1', name: 'Main Account' },
];

export function getNocCredentials() {
  return { userName: '', password: '', signature: '' };
}

export async function bookNocParcels() {
  return { Response: 'success', detail: [] };
}

export async function fetchNocCities() {
  return [];
}

export async function trackNocParcel() {
  return { Response: 'error', detail: [] };
}

export async function cancelNocParcel() {
  return { Response: 'success' };
}

export async function fetchNocPortalDashboard() {
  return [];
}
