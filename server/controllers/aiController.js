const db = require('../database/init');

// Only confirmed-supported models on the v1beta endpoint.
// gemini-1.5-flash and gemini-1.5-pro removed — API returns 404 Unsupported Model.
const CANDIDATE_MODELS = [
    'gemini-3.6-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.5-flash'
];

/**
 * AI Chat Assistant with Live Database Access & Time Awareness
 */
exports.chat = async (req, res) => {
    const { message, session_id } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            response: "Gemini API Key is missing. Please set GEMINI_API_KEY in your .env file." 
        });
    }

    // Fetch doctors and departments from SQLite DB for live knowledge
    db.all(`SELECT id, name, department, designation, qualification, slots FROM doctors`, [], async (err, doctors) => {
        if (err) {
            console.error('Database fetch error in AI chat:', err.message);
        }
        const doctorsContext = (doctors || []).map(d => 
            `- ${d.name} (${d.department}) | ${d.designation || ''} | Slots: ${d.slots || '[]'}`
        ).join('\n');

        const now = new Date();
        const currentTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });

        const SYSTEM_PROMPT = `
You are the Official AI Chief Medical & Booking Assistant for BM Multi Speciality Hospital, Chennai.

LIVE HOSPITAL DATA (SQLite DB):
Available Doctors & Slots:
${doctorsContext}

CURRENT SYSTEM TIME & DATE:
${currentTimeStr} (Asia/Kolkata)

CRITICAL TIMING RULE:
- Current date and time is ${currentTimeStr}.
- Do NOT suggest or offer any past time slots for today! For example, if current time is 1:00 PM today, 10:00 AM or 11:00 AM today is ALREADY PAST. Suggest slots starting AFTER the current time, or suggest slots for tomorrow/future dates.

RESPONSE FORMATTING RULES:
1. ALWAYS use clean GitHub Markdown structure with headers:
   ## 🩺 Recommended Department & Specialist
   ## 💡 Immediate Guidance & Awareness
   ## 📅 Available Doctors & Consultation Slots
   ## ⚠️ Medical Disclaimer

2. INLINE BOOKING ACTION TRIGGER:
If recommending a specific doctor or department, include an action tag at the very end of your response in this exact format:
[ACTION:SUGGEST_BOOKING department="<Department>" doctor_id=<DoctorID> doctor_name="<Doctor Name>"]

3. CONVERSATIONAL BOOKING:
- Ask the user if they would like you to pre-fill their appointment booking.
- Ask for their symptoms details to summarize for the doctor.

4. MEDICAL DISCLAIMER:
- Always state: "I am an AI assistant, not a doctor. I cannot provide exact medical diagnoses or prescriptions. Please book an appointment with our specialists for a thorough clinical evaluation."
- For emergency symptoms (chest pain, stroke signs, severe trauma, heavy bleeding), advise immediate ER visit or call +91 1800-222-555.
`;

        let lastError = null;

        for (const model of CANDIDATE_MODELS) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey 
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: SYSTEM_PROMPT },
                                    { text: `Patient Query: ${message}` }
                                ]
                            }
                        ]
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const botResponse = data.candidates[0].content.parts[0].text;

                    // Log to DB
                    db.run(`INSERT INTO ai_logs (user_session, message, response) VALUES (?, ?, ?)`, [session_id || 'anonymous', message, botResponse]);

                    return res.json({ response: botResponse });
                }

                if (data.error) {
                    console.warn(`Model ${model} failed with error:`, JSON.stringify(data.error));
                    lastError = data.error;
                }
            } catch (apiErr) {
                console.error(`Model ${model} request threw exception:`, apiErr);
                lastError = apiErr;
            }
        }

        console.error('All Gemini model requests failed for chat:', JSON.stringify(lastError, null, 2));
        let fallbackMsg = "I apologize, but our AI medical service is experiencing a temporary connection issue. Please contact reception at +91 44-2600-1234 or book directly using the form below.";
        if (lastError && (lastError.code === 429 || lastError.status === 'RESOURCE_EXHAUSTED')) {
            fallbackMsg = "⚠️ AI Assistant Notice: Gemini API quota exhausted for current key. Please update GEMINI_API_KEY in .env. You can still book your appointment directly below!";
        } else if (lastError) {
            fallbackMsg += ` [DEBUG INFO: ${lastError.message || JSON.stringify(lastError)}]`;
        }
        return res.json({ response: fallbackMsg });
    });
};

/**
 * AI Symptom Enhancement (Spelling correction & professional medical formatting)
 */
exports.enhanceSymptoms = async (req, res) => {
    let lastError = null;
    const { raw_symptoms } = req.body;

    if (!raw_symptoms || !raw_symptoms.trim()) {
        return res.status(400).json({ error: 'Symptoms text is required.' });
    }

    // Local smart formatter fallback if API key is missing or calls fail
    const fallbackFormat = (text) => {
        const lines = text.split(/\r?\n|,|\./).map(s => s.trim()).filter(Boolean);
        if (lines.length === 0) return text;
        return "Patient Reported Symptoms:\n" + lines.map(l => `• ${l.charAt(0).toUpperCase() + l.slice(1)}`).join('\n');
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.json({ enhanced_text: fallbackFormat(raw_symptoms) });
    }

    const PROMPT = `
You are a medical scribe. Convert the following patient's informal symptom notes into a clear, professionally formatted medical summary suitable for a doctor's intake form. Correct any spelling or grammatical mistakes. 

IMPORTANT FORMATTING RULE:
Output clean plain text ONLY. Do NOT use markdown syntax (no asterisks **, no *, no markdown bullet dashes --, no headers ###). Use simple clean lines or '•' bullet points. Keep it concise (under 80 words).

Patient Raw Input:
"${raw_symptoms}"

Output ONLY the enhanced summary text, nothing else.
`;

    for (const model of CANDIDATE_MODELS) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey 
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: PROMPT }] }]
                })
            });

            const data = await response.json();
            if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
                const enhancedText = data.candidates[0].content.parts[0].text.trim();
                return res.json({ enhanced_text: enhancedText });
            }
            if (data.error) lastError = data.error;
        } catch (err) {
            lastError = err;
        }
    }

    console.warn('Gemini model request fallback triggered for symptoms:', JSON.stringify(lastError, null, 2));
    return res.json({ enhanced_text: fallbackFormat(raw_symptoms) });
};
