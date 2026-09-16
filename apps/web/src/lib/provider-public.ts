const apiOrigin = () => process.env.KAILA_API_ORIGIN ?? "http://127.0.0.1:8000";

export type PublicProvider = {
  id: number;
  publicSlug: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  services: Array<{ id: number; name: string }>;
  serviceAreas: Array<{ id: number; name: string }>;
};

export async function fetchPublicProvider(providerId: string): Promise<PublicProvider | null> {
  if (!/^(?:[1-9][0-9]*|[a-z0-9]+(?:-[a-z0-9]+)+)$/.test(providerId)) return null;

  try {
    const response = await fetch(
      `${apiOrigin()}/api/v1/public/providers/${encodeURIComponent(providerId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { data: PublicProvider };
    return body.data;
  } catch {
    return null;
  }
}

export function publicProviderDescription(provider: PublicProvider): string {
  const services = provider.services.map((service) => service.name).join(", ");
  const areas = provider.serviceAreas.map((area) => area.name).join(", ");
  const summary = `${provider.displayName} offers ${services || "local services"}${areas ? ` in ${areas}` : ""}.`;
  return `${summary} View their provider profile and request service through KAILA.`;
}
