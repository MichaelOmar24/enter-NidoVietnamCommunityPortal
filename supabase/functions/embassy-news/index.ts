const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static notice board content from the embassy website
const NOTICE_BOARD = [
  {
    type: "notice",
    title: "VISAS",
    excerpt: "Visa applications are being processed within stipulated time after submission to the Embassy. Applicants are requested to attach all relevant documents to avoid delay.",
    url: "https://nigeriaembassy.org.vn/visas/",
  },
  {
    type: "notice",
    title: "PASSPORT",
    excerpt: "The Mission does not have a passport issuing desk. Passport intervention exercises are conducted periodically in HCMC and Hanoi by immigration officers from our Mission in Malaysia.",
    url: "https://nigeriaembassy.org.vn/consular/",
  },
  {
    type: "notice",
    title: "DOCUMENT AUTHENTICATION",
    excerpt: "All documents emanating from Nigeria for authentication MUST first be submitted to the Ministry of Foreign Affairs in Abuja. Submissions on Mondays, collection on Thursdays.",
    url: "https://nigeriaembassy.org.vn/legalization-of-documents-2/",
  },
  {
    type: "notice",
    title: "PAYMENT FOR CONSULAR SERVICES",
    excerpt: "Payments for consular services are made via Vietcombank USD accounts. Account name: EMBASSY OF NIGERIA. Main Acct: USD 1019626240. Admin Charges: USD 1025728916. Services must be submitted at Embassy before payment.",
    url: "https://nigeriaembassy.org.vn/consular/",
  },
];

function parseRSS(xml: string): { title: string; date: string; excerpt: string; url: string; category: string }[] {
  const items: { title: string; date: string; excerpt: string; url: string; category: string }[] = [];

  // Extract all <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    // Extract title (strip CDATA if present)
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Extract link
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const url = linkMatch ? linkMatch[1].trim() : "https://nigeriaembassy.org.vn/news-and-events/";

    // Extract pubDate
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    let date = "";
    if (dateMatch) {
      try {
        date = new Date(dateMatch[1].trim()).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric"
        });
      } catch {
        date = dateMatch[1].trim();
      }
    }

    // Extract description (strip HTML tags and CDATA)
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    let excerpt = "";
    if (descMatch) {
      excerpt = descMatch[1]
        .replace(/<[^>]+>/g, " ")     // strip HTML tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#8230;/g, "…")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);
      if (excerpt.length === 200) excerpt += "…";
    }

    // Extract category
    const catMatch = block.match(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/);
    const category = catMatch ? catMatch[1].trim() : "News";

    if (title) {
      items.push({ title, date, excerpt, url, category });
    }
  }

  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let newsItems: { title: string; date: string; excerpt: string; url: string; category: string }[] = [];
    let source = "fallback";

    // Fetch the WordPress RSS feed — completely free, no API key needed
    try {
      const response = await fetch("https://nigeriaembassy.org.vn/feed/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NIDO-Vietnam-Bot/1.0; +https://nidovietnam.org)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const xml = await response.text();
        const parsed = parseRSS(xml);
        if (parsed.length > 0) {
          newsItems = parsed;
          source = "rss_live";
          console.log(`Fetched ${parsed.length} items from embassy RSS feed`);
        }
      }
    } catch (fetchErr) {
      console.log("RSS fetch failed:", fetchErr?.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        newsItems,
        noticeBoard: NOTICE_BOARD,
        source,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        newsItems: [],
        noticeBoard: NOTICE_BOARD,
        source: "error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
