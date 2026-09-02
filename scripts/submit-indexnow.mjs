const SITE_ORIGIN = "https://kaila-app.com";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY = "617da2c3-b099-4e22-b4cc-c4986062468f";
const MAX_URLS = 10_000;

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => {
      try {
        return new URL(url).origin === SITE_ORIGIN;
      } catch {
        return false;
      }
    });
}

export async function submitIndexNow(fetchImpl = fetch) {
  const sitemapResponse = await fetchImpl(`${SITE_ORIGIN}/sitemap.xml`);
  if (!sitemapResponse.ok) {
    throw new Error(`Unable to read sitemap: HTTP ${sitemapResponse.status}`);
  }

  const urls = sitemapUrls(await sitemapResponse.text()).slice(0, MAX_URLS);
  if (urls.length === 0) {
    throw new Error("The sitemap contains no canonical KAILA URLs.");
  }

  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_ORIGIN).host,
      key: INDEXNOW_KEY,
      urlList: urls,
    }),
  });

  if (response.status !== 200 && response.status !== 202) {
    const detail = (await response.text()).trim();
    throw new Error(
      `IndexNow rejected the submission: HTTP ${response.status}${detail ? ` (${detail})` : ""}`,
    );
  }

  return { count: urls.length, status: response.status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  submitIndexNow()
    .then(({ count, status }) => {
      console.log(`IndexNow received ${count} URLs (HTTP ${status}).`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
