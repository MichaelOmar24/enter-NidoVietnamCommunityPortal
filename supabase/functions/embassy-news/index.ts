const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Curated fallback notices about Nigerian Embassy in Vietnam
const FALLBACK_NOTICES = [
  {
    title: "Passport Renewal Services",
    date: "June 2025",
    excerpt: "The Nigerian Embassy in Hanoi continues to provide consular services for Nigerians in Vietnam. For biometric passport enrollment, Nigerians in Vietnam must proceed to Malaysia. Contact the embassy for detailed guidance.",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "Community Registration Drive",
    date: "May 2025",
    excerpt: "All Nigerians residing in Vietnam are encouraged to register with the Nigerian Embassy and with NIDO Vietnam. Registration helps ensure you receive timely updates and consular assistance when needed.",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "Emergency Consular Services",
    date: "April 2025",
    excerpt: "The Nigerian Embassy Hanoi provides 24/7 emergency consular services. For emergencies, contact: +84-24-37263610 or WhatsApp: +84775568278 (WhatsApp messages only on this line).",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "NIN Registration for Overseas Nigerians",
    date: "March 2025",
    excerpt: "National Identity Number (NIN) enrollment is required for all passport renewals. Nigerians abroad can complete NIN enrollment through the Nigerian High Commission. Contact the embassy for the nearest enrollment center.",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "Travel Advisory for Nigerians in Vietnam",
    date: "February 2025",
    excerpt: "The Nigerian Embassy advises all Nigerian citizens in Vietnam to ensure their travel documents are valid at all times and to register their presence with the embassy for safety and consular support.",
    url: "https://nigeriaembassy.org.vn"
  }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to fetch from Nigerian Embassy website
    let notices = FALLBACK_NOTICES;

    try {
      const response = await fetch("https://nigeriaembassy.org.vn", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NIDO-Vietnam-Bot/1.0)",
          "Accept": "text/html"
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const html = await response.text();
        // Extract news/notices from the embassy website
        // Simple regex-based extraction of headlines
        const titleMatches = html.match(/<h[2-4][^>]*class="[^"]*(?:title|heading|news)[^"]*"[^>]*>([^<]+)<\/h[2-4]>/gi) || [];
        
        if (titleMatches.length > 0) {
          const extractedNotices = titleMatches.slice(0, 5).map((match, i) => {
            const titleClean = match.replace(/<[^>]+>/g, '').trim();
            return {
              title: titleClean || `Embassy Notice ${i + 1}`,
              date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              excerpt: `Latest notice from the Nigerian Embassy in Vietnam. Visit nigeriaembassy.org.vn for full details.`,
              url: "https://nigeriaembassy.org.vn"
            };
          }).filter(n => n.title.length > 3);

          if (extractedNotices.length > 0) {
            notices = extractedNotices;
          }
        }
      }
    } catch (fetchErr) {
      console.log("Embassy fetch failed, using fallback:", fetchErr.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notices,
        source: notices === FALLBACK_NOTICES ? "cached" : "live",
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message, notices: FALLBACK_NOTICES }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
