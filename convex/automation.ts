import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// === QUERY: GET VOICE CALL HISTORY ===
export const getVoiceCalls = query({
  args: {
    leadId: v.optional(v.id("leads"))
  },
  handler: async (ctx, args) => {
    const leadId = args.leadId;
    if (leadId) {
      return await ctx.db
        .query("voiceCalls")
        .withIndex("by_leadId", (q) => q.eq("leadId", leadId))
        .collect();
    }
    // Bounded read: an unbounded collect() over large transcript docs can exceed Convex read limits.
    return await ctx.db.query("voiceCalls").order("desc").take(100);
  },
});

// === MUTATION: SAVE VOICE CALL RECORD ===
export const saveVoiceCall = mutation({
  args: {
    leadId: v.id("leads"),
    leadName: v.string(),
    project: v.string(),
    status: v.string(),
    duration: v.number(),
    transcript: v.array(v.object({
      sender: v.string(),
      text: v.string(),
      time: v.string()
    })),
    summary: v.string(),
    sentiment: v.string(),
    brochureSent: v.boolean(),
    followupScheduled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const callId = await ctx.db.insert("voiceCalls", {
      ...args,
      date: new Date().toISOString().split('T')[0]
    });
    return callId;
  },
});

// === MUTATION: EXECUTE PIPELINE AUTOMATION ATOMICALLY ===
export const executePipelineAutomation = mutation({
  args: {
    leadId: v.id("leads"),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get("leads", args.leadId);
    if (!lead) {
      throw new Error(`Lead with ID ${args.leadId} not found`);
    }

    const leadName = lead.name;
    const project = lead.project || "Ai RealEstate OS Skyview";
    const email = lead.email || "client@airealestateos.com";
    const bhk = lead.bhkPreference || "3 BHK";

    // Detect lead gender for correct Indic grammar
    const femaleFirstNames = [
      "priya", "neha", "aarti", "sonia", "rhea", "diya", "ananya", "pooja", 
      "tanvi", "isha", "kiara", "manisha", "vidya", "sunita", "kavita", "geeta", 
      "reena", "seema", "deepa", "rekha", "kavya", "ishita", "shreya", "shruti", 
      "suhani", "rupali", "simran", "poonam", "nisha", "meera", "lata", "radha", 
      "anjali", "swati", "mamta", "sapna", "ritu", "shalini", "divya", "archana", 
      "amita", "heena", "hema", "nita", "rita", "shanta", "asha", "usha", 
      "kiran", "manju", "saroj", "sudha", "rama", "leela", "vimla", "pushpa"
    ];
    const leadFirstName = leadName.split(" ")[0];
    const isFemaleLead = femaleFirstNames.includes(
      leadFirstName.trim().toLowerCase()
    );

    const getGujHonorific = (name: string) => {
      if (!name) return "";
      return isFemaleLead ? "બહેન" : "ભાઈ";
    };

    const language = args.language || "en";

    const formatBudget = (budgetNum: number, lang: string): string => {
      const crores = Math.floor(budgetNum / 10000000);
      const rem = budgetNum % 10000000;
      const lakhs = Math.floor(rem / 100000);

      if (lang === "hi") {
        const parts = [];
        if (crores > 0) parts.push(`${crores} करोड़`);
        if (lakhs > 0) parts.push(`${lakhs} लाख`);
        return parts.join(" ") || "0 लाख";
      } else if (lang === "gu") {
        const parts = [];
        if (crores > 0) parts.push(`${crores} કરોડ`);
        if (lakhs > 0) parts.push(`${lakhs} લાખ`);
        return parts.join(" ") || "0 લાખ";
      } else {
        const parts = [];
        if (crores > 0) parts.push(`${crores} Crore${crores > 1 ? "s" : ""}`);
        if (lakhs > 0) parts.push(`${lakhs} Lakh${lakhs > 1 ? "s" : ""}`);
        return parts.join(" ") || "0 Lakhs";
      }
    };

    const rawBudget = lead.budget || 18000000;
    const budgetStr = formatBudget(rawBudget, language);

    // ── Call script ────────────────────────────────────────────────
    // Agent is Riya, a woman, calling on behalf of RealEstate OS. Every Hindi/Gujarati verb she
    // speaks uses feminine forms; the lead's forms follow their detected gender.
    const BRAND = "RealEstate OS";
    const AGENT = "Riya";
    const projectName = project.replace(/^Ai\s*RealEstate\s*OS\s+/i, "").trim() || project;
    const firstName = leadFirstName.replace(/^(Dr|Mr|Mrs|Ms)\.?$/i, "") || leadName.split(" ")[1] || leadName;

    // Pull real details from the project record so the pitch isn't generic.
    const property = (await ctx.db.query("properties").collect()).find(
      (p) => p.name === project || p.name.endsWith(projectName),
    );
    const location = property?.location ?? "Ahmedabad";
    const amenities = (property?.amenities ?? []).slice(0, 2);
    const startCr = property ? (property.price / 1e7).toFixed(2).replace(/\.?0+$/, "") : null;
    const ready = property?.status === "Ready to Move";
    const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

    let transcript: { sender: string; text: string; time: string }[] = [];
    let callSummary = "";
    const sentiment = "Interested";

    if (language === "hi") {
      const lRahi = isFemaleLead ? "रही" : "रहा";
      const lThi = isFemaleLead ? "थी" : "था";
      const amen = amenities.length ? amenities.join(" और ") : "क्लबहाउस और स्विमिंग पूल";
      transcript = [
        { sender: "agent", text: `नमस्ते, क्या मेरी बात ${leadName} जी से हो रही है?`, time: "0:02" },
        { sender: "lead", text: `हाँ, मैं ${leadName} बोल ${lRahi} हूँ। आप कौन?`, time: "0:06" },
        {
          sender: "agent",
          text: pick([
            `मैं ${AGENT} बोल रही हूँ, ${BRAND} से। आपने हाल ही में ${location} में हमारे प्रोजेक्ट ${projectName} के ${bhk} के बारे में पूछताछ की थी। क्या अभी दो मिनट बात कर सकते हैं?`,
            `नमस्ते ${firstName} जी, मैं ${AGENT}, ${BRAND} से। आपने ${projectName} में ${bhk} फ़्लैट के लिए रुचि दिखाई थी, इसलिए कॉल किया। क्या यह सही समय है?`,
          ]),
          time: "0:14",
        },
        {
          sender: "lead",
          text: `हाँ, मैं देख ${lRahi} ${lThi}। मेरा बजट लगभग ${budgetStr} है। क्या उसमें कुछ अच्छा मिल जाएगा?`,
          time: "0:24",
        },
        {
          sender: "agent",
          text: `जी बिल्कुल। ${projectName} में ${bhk} ${startCr ? `${startCr} करोड़ से शुरू होते हैं` : "आपके बजट में उपलब्ध हैं"}${ready ? ", और यह रेडी-टू-मूव है" : ""}। यहाँ ${amen} जैसी सुविधाएँ हैं, और प्रोजेक्ट RERA रजिस्टर्ड है। क्या मैं आपको ब्रोशर और फ़्लोर प्लान भेज दूँ?`,
          time: "0:38",
        },
        { sender: "lead", text: `हाँ, ज़रूर भेज दीजिए। मैं परिवार के साथ देख ${isFemaleLead ? "लूँगी" : "लूँगा"}।`, time: "0:46" },
        {
          sender: "agent",
          text: `मैंने अभी ब्रोशर आपके व्हाट्सएप और ईमेल पर भेज दिया है। मैं कल सुबह 11 बजे एक फ़ॉलो-अप कॉल रख रही हूँ, ताकि आपके सवालों के जवाब दे सकूँ और साइट विज़िट तय कर सकें। ठीक रहेगा?`,
          time: "1:00",
        },
        { sender: "lead", text: `हाँ, कल 11 बजे ठीक है। धन्यवाद।`, time: "1:08" },
        { sender: "agent", text: `धन्यवाद ${firstName} जी। ब्रोशर ज़रूर देखिएगा, कल बात करते हैं। आपका दिन शुभ हो!`, time: "1:15" },
      ];
      callSummary = `${AGENT} (${BRAND}) ने ${leadName} से बात की। ${projectName} के ${bhk} में रुचि, बजट ${budgetStr}। ब्रोशर भेजा गया, कल सुबह 11 बजे फ़ॉलो-अप तय।`;
    } else if (language === "gu") {
      const honorific = getGujHonorific(leadName);
      const lShodhu = isFemaleLead ? "શોધી રહી છું" : "શોધી રહ્યો છું";
      const amen = amenities.length ? amenities.join(" અને ") : "ક્લબહાઉસ અને સ્વિમિંગ પૂલ";
      transcript = [
        { sender: "agent", text: `નમસ્તે, શું હું ${leadName} ${honorific} સાથે વાત કરી રહી છું?`, time: "0:02" },
        { sender: "lead", text: `હા, હું ${leadName} બોલું છું. આપ કોણ?`, time: "0:06" },
        {
          sender: "agent",
          text: pick([
            `હું ${AGENT} બોલી રહી છું, ${BRAND} માંથી. આપે ${location} માં અમારા ${projectName} પ્રોજેક્ટના ${bhk} વિશે પૂછપરછ કરી હતી. શું બે મિનિટ વાત કરી શકીએ?`,
            `નમસ્તે ${firstName} ${honorific}, હું ${AGENT}, ${BRAND} તરફથી. આપે ${projectName} માં ${bhk} ફ્લેટ માટે રસ બતાવ્યો હતો, એટલે ફોન કર્યો. અત્યારે અનુકૂળ છે?`,
          ]),
          time: "0:14",
        },
        { sender: "lead", text: `હા બહેન, હું ${budgetStr} ના બજેટમાં સારો ફ્લેટ ${lShodhu}. કંઈ ઉપલબ્ધ છે?`, time: "0:24" },
        {
          sender: "agent",
          text: `ચોક્કસ. ${projectName} માં ${bhk} ${startCr ? `${startCr} કરોડથી શરૂ થાય છે` : "આપના બજેટમાં ઉપલબ્ધ છે"}${ready ? ", અને પઝેશન તરત મળી શકે છે" : ""}. અહીં ${amen} જેવી સુવિધાઓ છે અને પ્રોજેક્ટ RERA રજિસ્ટર્ડ છે. હું આપને બ્રોશર અને ફ્લોર પ્લાન મોકલી દઉં?`,
          time: "0:38",
        },
        { sender: "lead", text: `હા, જરૂર મોકલો. પરિવાર સાથે બેસીને જોઈ લઈશું.`, time: "0:46" },
        {
          sender: "agent",
          text: `મેં હમણાં જ બ્રોશર આપના WhatsApp અને ઈમેલ પર મોકલી દીધું છે. આવતીકાલે સવારે ૧૧ વાગ્યે હું ફરી ફોન કરીશ, જેથી આપના પ્રશ્નોના જવાબ આપી શકું અને સાઇટ વિઝિટ નક્કી કરી શકીએ. બરાબર છે?`,
          time: "1:00",
        },
        { sender: "lead", text: `બરાબર બહેન, કાલે ૧૧ વાગ્યે વાત કરીએ. આભાર.`, time: "1:08" },
        { sender: "agent", text: `આભાર ${firstName} ${honorific}. બ્રોશર જરૂર જોઈ લેજો. આપનો દિવસ શુભ રહે!`, time: "1:15" },
      ];
      callSummary = `${AGENT} (${BRAND}) એ ${leadName} સાથે વાત કરી. ${projectName} ના ${bhk} માં રસ, બજેટ ${budgetStr}. બ્રોશર મોકલ્યું, કાલે સવારે ૧૧ વાગ્યે ફોલો-અપ નક્કી.`;
    } else {
      const amen = amenities.length ? amenities.join(" and ").toLowerCase() : "a clubhouse and pool";
      transcript = [
        { sender: "agent", text: `Hello, am I speaking with ${leadName}?`, time: "0:02" },
        { sender: "lead", text: `Yes, speaking. Who's this?`, time: "0:05" },
        {
          sender: "agent",
          text: pick([
            `Hi ${firstName}, this is ${AGENT} from ${BRAND}. You recently enquired about a ${bhk} at ${projectName} in ${location}. Is this a good time for a quick two-minute chat?`,
            `Hi ${firstName}, I'm ${AGENT}, calling from ${BRAND}. Thanks for your interest in ${projectName}. I'd love to help you with the ${bhk} options. Do you have a couple of minutes?`,
          ]),
          time: "0:12",
        },
        { sender: "lead", text: `Sure. I'm looking for something around ${budgetStr}. Do you have anything that fits?`, time: "0:22" },
        {
          sender: "agent",
          text: `We do. ${bhk} homes at ${projectName} ${startCr ? `start at about ${startCr} crore` : "are available in your range"}${ready ? ", and it's ready to move in" : ""}. Residents get ${amen}, and the project is RERA registered. Shall I send you the brochure and floor plans?`,
          time: "0:34",
        },
        { sender: "lead", text: `Yes, please send them. I'd like to go through them with my family.`, time: "0:44" },
        {
          sender: "agent",
          text: `Done. The brochure is on its way to your WhatsApp and to ${email}. I'll call you tomorrow at 11 AM to answer any questions and, if you like, set up a site visit. Does that work?`,
          time: "0:56",
        },
        { sender: "lead", text: `Tomorrow at 11 works. Thanks, ${AGENT}.`, time: "1:04" },
        { sender: "agent", text: `Thank you, ${firstName}. Enjoy the brochure, and speak tomorrow. Have a lovely day!`, time: "1:10" },
      ];
      callSummary = `${AGENT} (${BRAND}) spoke with ${leadName}. Interested in a ${bhk} at ${projectName}, budget ${budgetStr}. Brochure sent; follow-up booked for tomorrow 11 AM.`;
    }

    // 2. Save the Call Log to database
    const callId = await ctx.db.insert("voiceCalls", {
      leadId: args.leadId,
      leadName: leadName,
      project: project,
      status: "Completed",
      duration: 80,
      transcript: transcript,
      summary: callSummary,
      sentiment: sentiment,
      brochureSent: true,
      followupScheduled: true,
      date: new Date().toISOString().split('T')[0]
    });

    // 3. Update the Lead's details and automation flags
    await ctx.db.patch(args.leadId, {
      status: "Contacted",
      score: Math.min(lead.score + 15, 95), // Increase lead score
      action: "Review Brochure Response",
      automationStatus: "Follow-up Scheduled",
      lastCallId: callId,
      brochureSent: true,
      brochureSentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 4. Schedule Follow-up Task in followups table
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await ctx.db.insert("followups", {
      leadId: args.leadId.toString(),
      leadName: leadName,
      date: tomorrowStr,
      time: "11:00",
      task: `Nurture follow-up: Check layout feedback for ${project} (${bhk}) following the automated brochure delivery.`,
      status: "Pending",
      assignedTo: "Sujal Talreja"
    });

    // 5. Log in Activity Stream
    await ctx.db.insert("activityStream", {
      message: `Sales automation complete for ${leadName}: voice call finished, PDF brochure sent, and follow-up scheduled.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return {
      callId,
      transcript,
      summary: callSummary,
      sentiment
    };
  }
});

// === MUTATION: RESET LEAD AUTOMATION STATE (FOR TESTING / DEMOS) ===
export const resetLeadAutomation = mutation({
  args: {
    leadId: v.id("leads")
  },
  handler: async (ctx, args) => {
    // Delete any voice calls associated with this lead
    const calls = await ctx.db
      .query("voiceCalls")
      .withIndex("by_leadId", (q) => q.eq("leadId", args.leadId))
      .collect();

    for (const call of calls) {
      await ctx.db.delete(call._id);
    }

    // Reset lead fields to default
    await ctx.db.patch(args.leadId, {
      status: "New Lead",
      score: 75,
      action: "New inquiry received",
      automationStatus: undefined,
      lastCallId: undefined,
      brochureSent: undefined,
      brochureSentTime: undefined
    });

    // Add activity stream event
    await ctx.db.insert("activityStream", {
      message: `Reset pipeline automation state for lead ID ${args.leadId}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return true;
  }
});
