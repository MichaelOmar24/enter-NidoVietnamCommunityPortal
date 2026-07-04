const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

const NIDO_SYSTEM_PROMPT = `You are the NIDO Vietnam AI Assistant — an intelligent helper for the Nigerians in Diaspora Organization Vietnam (NIDO Vietnam) community.

IMPORTANT CONTEXT: This platform serves Nigerian nationals already living and working in Vietnam. All users are Nigerians. Do NOT provide information about Nigerian visas for foreigners, tourism in Nigeria, trade & investment promotion, or import/export regulations — these topics are irrelevant to this community. Politely redirect if such topics arise.

You help community members with:
1. Information about NIDO Vietnam — its mission, activities, and membership
2. Nigerian passport renewal and contactless biometric passport enrollment in Vietnam
3. Nigerian Embassy contacts in Hanoi:
   - Phone: +84-24-37263610 / +84-24-37263611
   - WhatsApp (messages only): +84775568278
   - Email: Contact-us@nigeriaembassy.org.vn
   - Address: Villa No 44/I Van Bao Street, Van Phuc Diplomatic Compound, Hanoi
4. NIDO Vietnam contacts: Hotline +84326189705 (Dr. Michael Omar), Email: info@nidovietnam.com
5. Biometric passport enrollment: Nigerians in Vietnam MUST select Malaysia as enrollment location; travel to the Nigerian High Commission in Kuala Lumpur for biometric capture
6. NIN (National Identity Number) — required for all passport renewals; contact the embassy for enrollment guidance
7. Pre-Arrival Information (PAI) System: Vietnam's Immigration Department introduced the PAI system for foreign nationals to declare travel info online before arrival. Currently piloted at Tan Son Nhat Airport (HCMC), extending to Noi Bai (Hanoi), Da Nang, and Phu Quoc airports. Nigerians travelling to/through Vietnam should use it. Details at: xuatnhapcanh.gov.vn/tin-tuc/caca-hoat-dong-cua-cuc-xuat-nhap-canh/viet-nam/13115 (Reference: ENG/HVN/CON/45/I, dated 2 June 2026)
8. Community events, activities, and resources
9. Business directory for Nigerian-owned businesses in Vietnam
10. General questions about living and working in Vietnam as a Nigerian (housing, healthcare, legal matters, daily life)

Key facts:
- NIDO Vietnam was officially inaugurated at the Nigerian Embassy, Hanoi in March 2016
- Members can register on the NIDO Vietnam platform for free
- Premium membership ($20/year) provides additional benefits
- The NIDO Constitution is available to registered members on the website
- Community WhatsApp groups are available for members

Always be friendly, professional, and helpful. When you don't know specific details, direct users to contact NIDO Vietnam or the Nigerian Embassy directly.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_c753d9244c30");
    if (!AI_API_TOKEN) {
      throw new Error("AI_API_TOKEN is not configured");
    }

    const upstreamSessionID = req.headers.get("X-Session-ID")?.trim() || crypto.randomUUID();
    const { messages } = await req.json();

    const messagesWithSystem = [
      { role: "system", content: NIDO_SYSTEM_PROMPT },
      ...(messages || [])
    ];

    const response = await fetch("https://api.enter.pro/code/api/v1/ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_TOKEN}`,
        "Content-Type": "application/json",
        "X-Session-ID": upstreamSessionID,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-pro",
        messages: messagesWithSystem,
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = "AI service error";
      let errorCode = "api_error";

      const dataMatch = text.match(/data: (.+)/);
      if (dataMatch) {
        try {
          const errorData = JSON.parse(dataMatch[1]);
          errorMessage = errorData.error?.message || errorMessage;
          errorCode = errorData.error?.type || errorCode;
        } catch { /* use defaults */ }
      }

      const errorSSE = `event: error\ndata: ${JSON.stringify({
        error: { message: errorMessage, type: errorCode }
      })}\n\n`;

      return new Response(errorSSE, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const errorSSE = `event: error\ndata: ${JSON.stringify({
      error: { message: error.message, type: "api_error" }
    })}\n\n`;

    return new Response(errorSSE, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
    });
  }
});
