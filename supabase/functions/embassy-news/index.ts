const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Topics irrelevant to Nigerian community members already living in Vietnam
const EXCLUDED_KEYWORDS = [
  "trade", "investment", "visa", "tourism", "tourist", "import", "export",
  "business visa", "travel visa", "visit nigeria", "tour", "economic"
];

function isRelevantNotice(title: string, excerpt: string): boolean {
  const text = (title + " " + excerpt).toLowerCase();
  return !EXCLUDED_KEYWORDS.some(kw => text.includes(kw));
}

// Curated, verified notices for Nigerians in Vietnam
const FALLBACK_NOTICES = [
  {
    title: "Pre-Arrival Information (PAI) System",
    date: "2 June 2026",
    excerpt: "Vietnam's Immigration Department has introduced a Pre-Arrival Information (PAI) System allowing foreign nationals to declare travel information online before arriving in Vietnam. Currently piloted at Tan Son Nhat International Airport (HCMC), with plans to extend to Noi Bai (Hanoi), Da Nang, and Phu Quoc airports. Nigerian nationals travelling to or through Vietnam are strongly encouraged to register at: xuatnhapcanh.gov.vn. Reference: ENG/HVN/CON/45/I.",
    url: "https://xuatnhapcanh.gov.vn/tin-tuc/caca-hoat-dong-cua-cuc-xuat-nhap-canh/viet-nam/13115"
  },
  {
    title: "Biometric Passport Enrollment — Select Malaysia",
    date: "June 2026",
    excerpt: "Nigerians residing in Vietnam must select Malaysia as their enrollment location when applying for the contactless biometric passport. There is no Nigerian Immigration enrollment center in Vietnam. Travel to the Nigerian High Commission in Kuala Lumpur for biometric capture. Ensure you have your NIN and current passport.",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "Community Registration with the Embassy",
    date: "May 2026",
    excerpt: "All Nigerians residing in Vietnam are encouraged to register with the Nigerian Embassy in Hanoi. Registration ensures you receive timely consular updates, emergency assistance, and official notifications. Contact the embassy: +84-24-37263610 or Email: Contact-us@nigeriaembassy.org.vn.",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "NIN Requirement for Passport Renewals",
    date: "April 2026",
    excerpt: "A valid National Identity Number (NIN) is mandatory for all Nigerian passport renewals and new applications. If you have not yet obtained your NIN, contact the Nigerian Embassy Hanoi for guidance on how to enroll from abroad.",
    url: "https://nigeriaembassy.org.vn"
  },
  {
    title: "Emergency Consular Services",
    date: "March 2026",
    excerpt: "The Nigerian Embassy Hanoi provides consular services for Nigerians in Vietnam. For emergencies contact: +84-24-37263610 / +84-24-37263611. WhatsApp (messages only): +84775568278. Embassy address: Villa No 44/I Van Bao Street, Van Phuc Diplomatic Compound, Hanoi.",
    url: "https://nigeriaembassy.org.vn"
  }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let notices = FALLBACK_NOTICES;

    // Attempt to fetch live notices from embassy website
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
        const titleMatches = html.match(/<h[2-4][^>]*class="[^"]*(?:title|heading|news)[^"]*"[^>]*>([^<]+)<\/h[2-4]>/gi) || [];

        if (titleMatches.length > 0) {
          const extracted = titleMatches.slice(0, 10).map((match, i) => {
            const title = match.replace(/<[^>]+>/g, '').trim();
            return {
              title: title || `Embassy Notice ${i + 1}`,
              date: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
              excerpt: "Latest notice from the Nigerian Embassy in Vietnam. Visit nigeriaembassy.org.vn for full details.",
              url: "https://nigeriaembassy.org.vn"
            };
          })
          // Filter out trade/visa/tourism — irrelevant to Nigerian community members in Vietnam
          .filter(n => n.title.length > 3 && isRelevantNotice(n.title, n.excerpt));

          if (extracted.length > 0) {
            // Always keep PAI notice as first item, then append live notices
            notices = [FALLBACK_NOTICES[0], ...extracted.slice(0, 4)];
          }
        }
      }
    } catch (fetchErr) {
      console.log("Embassy fetch failed, using curated fallback:", fetchErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notices,
        source: notices === FALLBACK_NOTICES ? "curated" : "live",
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
