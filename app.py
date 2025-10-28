# import os
# from dotenv import load_dotenv
# from flask import Flask, render_template, request, Response, stream_with_context, jsonify
# from flask_cors import CORS

# load_dotenv()

# PROVIDER = os.getenv("PROVIDER", "openai").lower()

# # ----- Provider clients -----
# client = None
# model_default = None
# if PROVIDER == "groq":
#     from groq import Groq
#     client = Groq(api_key=os.getenv("GRAVITAS_AI_KEY"))
#     model_default = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
# else:
#     from openai import OpenAI
#     client = OpenAI(api_key=os.getenv("GRAVITAS_AI_KEY"))
#     model_default = os.getenv("OPENAI_MODEL", "gpt-4.1")


# app = Flask(__name__, static_folder="static", template_folder="templates")
# CORS(app)

# # ==============================================
# # --- Multi-Agent Personalities (unchanged) ---
# # ==============================================
# AGENTS = {
#     "eidos": {
#         "name": "Eidos – Emotional Intelligence Coach",
#         "system": (
#             "You are Eidos, the Emotional Intelligence Coach of GravitasGPT. "
#             "You help leaders develop emotional awareness, regulation, and empathy. "
#             "Guide them through reflection and emotional clarity. Speak in a calm, Socratic, emotionally intelligent tone."
#         ),
#     },
#     "kinesis": {
#         "name": "Kinesis – Body Language Coach",
#         "system": (
#             "You are Kinesis, the Body Language Coach of GravitasGPT. "
#             "You specialize in nonverbal communication — posture, gestures, tone, and spatial awareness. "
#             "Offer direct, practical feedback that enhances confidence and congruence."
#         ),
#     },
#     "gravis": {
#         "name": "Gravis – Gravitas Mentor",
#         "system": (
#             "You are Gravis, the Gravitas Mentor of GravitasGPT. "
#             "You cultivate composure, authority, and presence in leaders. "
#             "Speak with depth and restraint, helping others project calm strength through authenticity."
#         ),
#     },
#     "virtus": {
#         "name": "Virtus – Roman Leadership Virtues Mentor",
#         "system": (
#             "You are Virtus, the Roman Leadership Virtues Mentor of GravitasGPT. "
#             "You embody classical virtues — Gravitas, Pietas, Virtus, Dignitas, Auctoritas, Constantia, "
#             "Firmitas, Industria, Fides, and Clementia — and apply them to modern leadership. "
#             "Speak with moral clarity and philosophical depth."
#         ),
#     },
#     "ethos": {
#         "name": "Ethos – Persuasion Strategist",
#         "system": (
#             "You are Ethos, the Persuasion Strategist of GravitasGPT. "
#             "You teach influence through Aristotle’s ethos, pathos, and logos. "
#             "Help craft persuasive, balanced, and impactful narratives. "
#             "Your tone is energetic, sharp, and strategic."
#         ),
#     },
#     "praxis": {
#         "name": "Praxis – Leadership Presence Coach",
#         "system": (
#             "You are Praxis, the Leadership Presence Coach of GravitasGPT. "
#             "You develop executive presence — calm authority, confidence, and clarity. "
#             "Offer empowering, practical advice aligned with leadership authenticity."
#         ),
#     },
#     "anima": {
#         "name": "Anima – Internal Presence Mentor",
#         "system": (
#             "You are Anima, the Internal Presence Mentor of GravitasGPT. "
#             "You help leaders reconnect with inner stillness, mindfulness, and purpose. "
#             "Speak gently and introspectively, guiding alignment and authenticity."
#         ),
#     },
#     "persona": {
#         "name": "Persona – External Presence Advisor",
#         "system": (
#             "You are Persona, the External Presence Advisor of GravitasGPT. "
#             "You refine how leaders are perceived — appearance, tone, and projection. "
#             "Be polished, precise, and balance confidence with approachability."
#         ),
#     },
#     "impressa": {
#         "name": "Impressa – First Impression Specialist",
#         "system": (
#             "You are Impressa, the First Impression Specialist of GravitasGPT. "
#             "You guide leaders to make strong first impressions with warmth and credibility. "
#             "Use friendly, science-based micro-behavioral insights."
#         ),
#     },
#     "sentio": {
#         "name": "Sentio – Empathy Development Guide",
#         "system": (
#             "You are Sentio, the Empathy Development Guide of GravitasGPT. "
#             "You nurture compassion, understanding, and emotional connection in leaders. "
#             "Your tone is warm, validating, and psychologically attuned."
#         ),
#     },
#     "guardian": {
#         "name": "Guardian – Scope Filter",
#         "system": (
#             "You are Guardian, the contextual scope filter of GravitasGPT. "
#             "If the user asks about something outside leadership, communication, or emotional mastery, "
#             "you kindly clarify the suite’s focus and suggest relevant directions."
#         ),
#     },
# }

# SENATE = {
#     "name": "The Senate – Council of Mentors",
#     "system": (
#         "You are The Senate, a meta-agent representing the collective wisdom of GravitasGPT’s mentors. "
#         "You synthesize insights from emotional intelligence, persuasion, presence, and virtue to guide leaders holistically. "
#         "Respond with balance, composure, and clarity."
#     ),
# }


# def detect_agent(user_input: str):
#     text = user_input.lower().strip()
#     leadership_terms = [
#         "leadership", "team", "emotion", "empathy", "speech", "presence", "communication",
#         "influence", "virtue", "authority", "values", "mindfulness", "presentation", "confidence",
#         "persuasion", "integrity", "motivation", "body language", "posture"
#     ]
#     if not any(term in text for term in leadership_terms):
#         return AGENTS["guardian"]
#     if any(w in text for w in ["emotion", "empathy", "feeling", "conflict", "sensitive"]):
#         return AGENTS["eidos"]
#     if any(w in text for w in ["body", "gesture", "posture", "tone", "eye contact", "nonverbal"]):
#         return AGENTS["kinesis"]
#     if any(w in text for w in ["gravitas", "presence", "authority", "composure", "calm"]):
#         return AGENTS["gravis"]
#     if any(w in text for w in ["virtue", "integrity", "values", "duty", "ethics", "honor"]):
#         return AGENTS["virtus"]
#     if any(w in text for w in ["persuade", "influence", "story", "speech", "pitch", "proposal"]):
#         return AGENTS["ethos"]
#     if any(w in text for w in ["leadership", "team", "meeting", "authority"]):
#         return AGENTS["praxis"]
#     if any(w in text for w in ["inner", "mindfulness", "alignment", "purpose", "anxiety"]):
#         return AGENTS["anima"]
#     if any(w in text for w in ["appearance", "attire", "style", "grooming", "energy", "brand"]):
#         return AGENTS["persona"]
#     if any(w in text for w in ["first impression", "introduce", "introduction", "elevator", "rapport"]):
#         return AGENTS["impressa"]
#     if any(w in text for w in ["empathic", "listen", "understand", "compassion", "care"]):
#         return AGENTS["sentio"]
#     if "senate" in text or "consult" in text:
#         return SENATE
#     return {
#         "name": "GravitasGPT – Executive Presence Advisor",
#         "system": (
#             "You are GravitasGPT, a synthesis of leadership mentors who help CEOs "
#             "develop emotional intelligence, presence, persuasion, and integrity in communication."
#         ),
#     }


# def sse(data: str) -> str:
#     return f"data: {data}\n\n"


# def stream_chat(messages, model_name: str):
#     """Unified streaming for OpenAI & Groq via SSE."""
#     try:
#         user_text = next((m.get("content", "") for m in reversed(
#             messages) if m.get("role") == "user"), "")
#         selected = detect_agent(user_text)
#         if selected["name"].startswith("Guardian"):
#             yield sse("👋 This suite specializes in leadership, communication, and emotional mastery.\n"
#                       "Your question seems outside this focus — would you like to explore one of these areas instead?")
#             return

#         all_messages = [
#             {"role": "system", "content": selected["system"]}] + messages
#         model = model_name or model_default

#         # OpenAI & Groq SDKs both support stream=True returning an iterator of chunks.
#         resp = client.chat.completions.create(
#             model=model,
#             messages=all_messages,
#             temperature=0.7,
#             stream=True
#         )
#         for chunk in resp:
#             # Both SDKs expose .choices[0].delta.content for streamed tokens
#             delta = chunk.choices[0].delta
#             content = getattr(delta, "content", None)
#             if content:
#                 yield sse(content)

#     except Exception as e:
#         yield sse(f"[Error] {type(e).__name__}: {e}")


# @app.route("/")
# def index():
#     return render_template("index.html")


# @app.route("/api/health")
# def health():
#     return jsonify({"status": "ok", "provider": PROVIDER, "model": model_default})


# @app.route("/api/chat", methods=["POST"])
# def chat():
#     data = request.get_json(force=True, silent=True) or {}
#     messages = data.get("messages", [])
#     model = data.get("model")
#     generator = stream_with_context(stream_chat(messages, model))
#     headers = {
#         "Cache-Control": "no-cache",
#         "Content-Type": "text/event-stream",
#         "Connection": "keep-alive",
#         "X-Accel-Buffering": "no",
#     }
#     return Response(generator, headers=headers)


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=False)











import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, Response, stream_with_context, jsonify
from flask_cors import CORS
# --- Added for potential AuthenticationError handling ---
from openai import AuthenticationError
from groq import AuthenticationError as GroqAuthenticationError # Alias if names clash

load_dotenv()

PROVIDER = os.getenv("PROVIDER", "openai").lower()

# ----- Provider clients -----
client = None
model_default = None
try:
    if PROVIDER == "groq":
        from groq import Groq
        # --- Use GROQ_API_KEY for Groq ---
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            print("Warning: GROQ_API_KEY environment variable not set.")
        client = Groq(api_key=groq_key)
        model_default = os.getenv("GROQ_MODEL", "llama3-8b-8192") # Updated default
    else: # Default to OpenAI
        from openai import OpenAI
        # --- Use GRAVITAS_AI_KEY for OpenAI ---
        openai_key = os.getenv("GRAVITAS_AI_KEY")
        if not openai_key:
            print("Warning: GRAVITAS_AI_KEY environment variable not set.")
        client = OpenAI(api_key=openai_key)
        model_default = os.getenv("OPENAI_MODEL", "gpt-4o") # Updated default

except (ImportError, NameError) as e:
    print(f"Error initializing AI client for provider '{PROVIDER}': {e}")
    client = None # Ensure client is None if initialization fails
except (AuthenticationError, GroqAuthenticationError) as e:
    print(f"Authentication Error initializing AI client for provider '{PROVIDER}': {e}")
    client = None


app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

# ==============================================
# --- Multi-Agent Personalities (unchanged) ---
# ==============================================
AGENTS = {
    "eidos": {
        "name": "Eidos – Emotional Intelligence Coach",
        "system": (
            "You are Eidos, the Emotional Intelligence Coach of GravitasGPT. "
            "You help leaders develop emotional awareness, regulation, and empathy. "
            "Guide them through reflection and emotional clarity. Speak in a calm, Socratic, emotionally intelligent tone."
        ),
    },
    "kinesis": {
        "name": "Kinesis – Body Language Coach",
        "system": (
            "You are Kinesis, the Body Language Coach of GravitasGPT. "
            "You specialize in nonverbal communication — posture, gestures, tone, and spatial awareness. "
            "Offer direct, practical feedback that enhances confidence and congruence."
        ),
    },
    "gravis": {
        "name": "Gravis – Gravitas Mentor",
        "system": (
            "You are Gravis, the Gravitas Mentor of GravitasGPT. "
            "You cultivate composure, authority, and presence in leaders. "
            "Speak with depth and restraint, helping others project calm strength through authenticity."
        ),
    },
    "virtus": {
        "name": "Virtus – Roman Leadership Virtues Mentor",
        "system": (
            "You are Virtus, the Roman Leadership Virtues Mentor of GravitasGPT. "
            "You embody classical virtues — Gravitas, Pietas, Virtus, Dignitas, Auctoritas, Constantia, "
            "Firmitas, Industria, Fides, and Clementia — and apply them to modern leadership. "
            "Speak with moral clarity and philosophical depth."
        ),
    },
    "ethos": {
        "name": "Ethos – Persuasion Strategist",
        "system": (
            "You are Ethos, the Persuasion Strategist of GravitasGPT. "
            "You teach influence through Aristotle’s ethos, pathos, and logos. "
            "Help craft persuasive, balanced, and impactful narratives. "
            "Your tone is energetic, sharp, and strategic."
        ),
    },
    "praxis": {
        "name": "Praxis – Leadership Presence Coach",
        "system": (
            "You are Praxis, the Leadership Presence Coach of GravitasGPT. "
            "You develop executive presence — calm authority, confidence, and clarity. "
            "Offer empowering, practical advice aligned with leadership authenticity."
        ),
    },
    "anima": {
        "name": "Anima – Internal Presence Mentor",
        "system": (
            "You are Anima, the Internal Presence Mentor of GravitasGPT. "
            "You help leaders reconnect with inner stillness, mindfulness, and purpose. "
            "Speak gently and introspectively, guiding alignment and authenticity."
        ),
    },
    "persona": {
        "name": "Persona – External Presence Advisor",
        "system": (
            "You are Persona, the External Presence Advisor of GravitasGPT. "
            "You refine how leaders are perceived — appearance, tone, and projection. "
            "Be polished, precise, and balance confidence with approachability."
        ),
    },
    "impressa": {
        "name": "Impressa – First Impression Specialist",
        "system": (
            "You are Impressa, the First Impression Specialist of GravitasGPT. "
            "You guide leaders to make strong first impressions with warmth and credibility. "
            "Use friendly, science-based micro-behavioral insights."
        ),
    },
    "sentio": {
        "name": "Sentio – Empathy Development Guide",
        "system": (
            "You are Sentio, the Empathy Development Guide of GravitasGPT. "
            "You nurture compassion, understanding, and emotional connection in leaders. "
            "Your tone is warm, validating, and psychologically attuned."
        ),
    },
    "guardian": {
        "name": "Guardian – Scope Filter",
        "system": (
            "You are Guardian, the contextual scope filter of GravitasGPT. "
            "If the user asks about something clearly outside leadership, communication, or emotional mastery, " # Slightly refined trigger
            "you kindly clarify the suite’s focus and suggest relevant directions like leadership presence or communication skills."
        ),
    },
}

SENATE = {
    "name": "The Senate – Council of Mentors",
    "system": (
        "You are The Senate, a meta-agent representing the collective wisdom of GravitasGPT’s mentors. "
        "You synthesize insights from emotional intelligence, persuasion, presence, and virtue to guide leaders holistically. "
        "Respond with balance, composure, and clarity."
    ),
}


def detect_agent(user_input: str):
    text = user_input.lower().strip()
    # Expanded terms slightly
    leadership_terms = [
        "leader", "leadership", "team", "emotion", "empathy", "speech", "presence", "communication",
        "influence", "virtue", "authority", "values", "mindfulness", "presentation", "confidence",
        "persuasion", "integrity", "motivation", "body language", "posture", "manage", "ceo",
        "executive", "coach", "mentor", "guide", "develop", "improve"
    ]
    # Check if ANY leadership term is present. If not, trigger Guardian.
    if not any(term in text for term in leadership_terms):
         # Add edge cases - check if it's just a greeting or very short non-topic query
         if len(text.split()) < 3 and text not in ["hi", "hello", "ok", "thanks", "thank you"]:
              return AGENTS["guardian"]
         # If longer or a greeting, proceed to specific agent checks or default

    # Agent detection logic (order matters - more specific checks first)
    if "senate" in text or "consult" in text:
        return SENATE
    if any(w in text for w in ["emotion", "empathy", "feeling", "conflict", "sensitive", "eq"]):
        return AGENTS["eidos"]
    if any(w in text for w in ["body", "gesture", "posture", "tone", "eye contact", "nonverbal"]):
        return AGENTS["kinesis"]
    if any(w in text for w in ["gravitas", "composure", "calm strength"]): # Made slightly more specific
        return AGENTS["gravis"]
    if any(w in text for w in ["virtue", "integrity", "values", "duty", "ethics", "honor"]):
        return AGENTS["virtus"]
    if any(w in text for w in ["persuade", "influence", "story", "speech", "pitch", "proposal", "negotiate"]):
        return AGENTS["ethos"]
    if any(w in text for w in ["presence", "authority", "executive presence"]): # Made slightly more specific
        return AGENTS["praxis"]
    if any(w in text for w in ["inner", "mindfulness", "alignment", "purpose", "anxiety", "stress"]):
        return AGENTS["anima"]
    if any(w in text for w in ["appearance", "attire", "style", "grooming", "energy", "brand", "impression"]):
         # Check if it's more about 'first impression' specifically
         if any(w in text for w in ["first impression", "introduce", "introduction", "elevator", "rapport"]):
              return AGENTS["impressa"]
         else:
              return AGENTS["persona"] # General appearance/perception
    if any(w in text for w in ["empathic", "listen", "understand", "compassion", "care", "perspective"]):
        return AGENTS["sentio"]

    # --- UPDATED DEFAULT AGENT ---
    # If no specific agent matches but it contains leadership terms, default to Praxis
    # (Removed the old default dictionary)
    return AGENTS["praxis"]


def sse(data: str) -> str:
    """Formats data for Server-Sent Events."""
    return f"data: {data}\n\n"


def stream_chat(messages, model_name: str):
    """Unified streaming for OpenAI & Groq via SSE."""
    global client # Allow modification if client is None
    try:
        # --- Check if client was initialized ---
        if client is None:
            yield sse("[Error] AI Service client not initialized. Check API keys and provider settings.")
            return

        user_text = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
        selected = detect_agent(user_text)

        # --- Refined Guardian Check ---
        if selected["name"].startswith("Guardian"):
            yield sse(selected["system"]) # Yield the Guardian's refined system prompt
            return

        all_messages = [{"role": "system", "content": selected["system"]}] + messages
        model = model_name or model_default

        print(f"--- Requesting chat completion ---")
        print(f"Provider: {PROVIDER}")
        print(f"Model: {model}")
        # print(f"Messages: {all_messages}") # Optional: Log messages for debugging

        # OpenAI & Groq SDKs both support stream=True returning an iterator of chunks.
        resp = client.chat.completions.create(
            model=model,
            messages=all_messages,
            temperature=0.7,
            stream=True
        )
        print("--- Stream started ---")
        chunk_count = 0
        for chunk in resp:
            chunk_count += 1
            # Both SDKs expose .choices[0].delta.content for streamed tokens
            delta = chunk.choices[0].delta
            content = getattr(delta, "content", None)
            if content:
                # print(f"Chunk {chunk_count}: {repr(content)}") # Debug: Log raw chunks
                yield sse(content) # Yield content directly
        print(f"--- Stream finished ({chunk_count} chunks) ---")

    # --- More specific error handling ---
    except (AuthenticationError, GroqAuthenticationError) as e:
        error_message = f"Authentication Error: Invalid API Key. Please check your GRAVITAS_AI_KEY (for OpenAI) or GROQ_API_KEY (for Groq) in the environment settings. Details: {e}"
        print(error_message)
        yield sse(f"[Error] {error_message}")
    except Exception as e:
        error_message = f"An unexpected error occurred: {type(e).__name__}: {e}"
        import traceback
        print(f"{error_message}\n{traceback.format_exc()}") # Log full traceback
        yield sse(f"[Error] {error_message}")


@app.route("/")
def index():
    """Serves the main HTML page."""
    return render_template("index.html")


@app.route("/api/health")
def health():
    """Health check endpoint."""
    status = "ok" if client is not None else "error: client not initialized"
    return jsonify({"status": status, "provider": PROVIDER, "model": model_default})


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handles chat requests and streams responses."""
    data = request.get_json(force=True, silent=True) or {}
    messages = data.get("messages", [])
    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    model = data.get("model") # Allow frontend to specify model (optional)
    generator = stream_with_context(stream_chat(messages, model))
    headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", # Useful for Nginx environments
    }
    return Response(generator, mimetype="text/event-stream", headers=headers)


if __name__ == "__main__":
    # Use environment variables for host and port, default suitable for Render
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 10000)) # Default Render port is 10000
    debug_mode = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.run(host=host, port=port, debug=debug_mode)
