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
    excerpt: "All documents for authentication MUST first be submitted to the Ministry of Foreign Affairs in Abuja. Submissions on Mondays, collection on Thursdays.",
    url: "https://nigeriaembassy.org.vn/legalization-of-documents-2/",
  },
  {
    type: "notice",
    title: "CONSULAR PAYMENT",
    excerpt: "Payments for consular services via Vietcombank USD accounts. Account name: EMBASSY OF NIGERIA. Main Acct: USD 1019626240. Admin Charges: USD 1025728916. Services must be submitted at Embassy before payment.",
    url: "https://nigeriaembassy.org.vn/consular/",
  },
];

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeContent(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    // Fix image URLs to be absolute
    .replace(/src="\/wp-content/g, 'src="https://nigeriaembassy.org.vn/wp-content')
    .replace(/src='\/wp-content/g, "src='https://nigeriaembassy.org.vn/wp-content")
    // Remove WordPress-specific classes that won't render
    .replace(/class="[^"]*alignnone[^"]*"/gi, 'class="mx-auto block"')
    .trim();
}

interface WPPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  _embedded?: { "wp:term"?: { name: string }[][] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let newsItems: {
      id: number;
      title: string;
      date: string;
      excerpt: string;
      content: string;
      url: string;
      category: string;
    }[] = [];
    let source = "fallback";

    // Try WordPress REST API first — gives us full article content
    try {
      const apiUrl = "https://nigeriaembassy.org.vn/wp-json/wp/v2/posts?per_page=8&_embed=wp:term";
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NIDO-Vietnam-Bot/1.0)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const posts: WPPost[] = await response.json();
        if (Array.isArray(posts) && posts.length > 0) {
          newsItems = posts.map((post) => {
            // Extract category name from _embedded
            let category = "News";
            try {
              const terms = post._embedded?.["wp:term"];
              if (terms && terms[0] && terms[0][0]?.name) {
                category = terms[0][0].name;
              }
            } catch {
              // ignore
            }

            const date = new Date(post.date).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            });

            const excerpt = stripHtmlTags(post.excerpt?.rendered || "").slice(0, 220);
            const content = sanitizeContent(post.content?.rendered || "");
            const title = stripHtmlTags(post.title?.rendered || "Untitled");

            return {
              id: post.id,
              title,
              date,
              excerpt: excerpt + (excerpt.length === 220 ? "…" : ""),
              content,
              url: post.link,
              category,
            };
          });
          source = "wp_api";
          console.log(`Fetched ${newsItems.length} posts from WordPress REST API`);
        }
      }
    } catch (apiErr) {
      console.log("WP API failed, trying RSS:", apiErr?.message);

      // Fallback: parse RSS feed (no full content but at least titles/dates)
      try {
        const rssResponse = await fetch("https://nigeriaembassy.org.vn/feed/", {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NIDO-Vietnam-Bot/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (rssResponse.ok) {
          const xml = await rssResponse.text();
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          let match;
          let idx = 0;
          while ((match = itemRegex.exec(xml)) !== null && idx < 8) {
            const block = match[1];
            const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
            const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
            const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
            const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
            const catMatch = block.match(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/);
            const title = titleMatch ? titleMatch[1].trim() : "";
            if (!title) continue;
            const url = linkMatch ? linkMatch[1].trim() : "https://nigeriaembassy.org.vn";
            let date = "";
            if (dateMatch) {
              try { date = new Date(dateMatch[1].trim()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch { date = dateMatch[1].trim(); }
            }
            const excerpt = descMatch ? stripHtmlTags(descMatch[1]).slice(0, 220) : "";
            const category = catMatch ? catMatch[1].trim() : "News";
            newsItems.push({ id: idx, title, date, excerpt, content: "", url, category });
            idx++;
          }
          if (newsItems.length > 0) source = "rss_live";
        }
      } catch (rssErr) {
        console.log("RSS also failed:", rssErr?.message);
      }
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
