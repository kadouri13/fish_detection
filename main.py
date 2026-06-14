import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
import random
from pathlib import Path

load_dotenv()

app = FastAPI()

# Allow CORS for local dev and frontend deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    language: str = "ar"

@app.get("/api/marine-data")
async def get_marine_data(lat: float, lng: float):
    # Fetch from Open-Meteo Marine and Weather APIs
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,wind_speed_10m"
    marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lng}&current=wave_height"
    
    async with httpx.AsyncClient() as client:
        try:
            weather_resp = await client.get(weather_url)
            weather_data = weather_resp.json()
            
            marine_resp = await client.get(marine_url)
            marine_data = marine_resp.json()
            
            # Extract data with fallbacks
            temp = weather_data.get("current", {}).get("temperature_2m", 20.0)
            wind = weather_data.get("current", {}).get("wind_speed_10m", 15.0)
            
            # Convert wind from km/h to knots
            wind_knots = wind * 0.539957 if wind is not None else 10.0
            
            wave_height = marine_data.get("current", {}).get("wave_height", 1.0)
            
            # Mock current and chlorophyll since open-meteo doesn't reliably provide it
            current_velocity = random.uniform(0.05, 0.4)
            chlorophyll = random.uniform(0.2, 0.8)
            
            return {
                "temp": temp,
                "wind": wind_knots,
                "chloro": chlorophyll,
                "current": current_velocity,
                "wave_height": wave_height
            }
            
        except Exception as e:
            print(f"Error fetching data: {e}")
            # Fallback
            return {
                "temp": 18.5,
                "wind": 12.0,
                "chloro": 0.4,
                "current": 0.15,
                "wave_height": 1.2
            }

@app.post("/api/chat")
async def chat_with_assistant(req: ChatRequest):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"response": "⚠️ Please configure GEMINI_API_KEY in the backend to use the AI assistant."}
        
    try:
        client = genai.Client(api_key=api_key)
        
        system_prompt = "You are Sayyad, a smart AI assistant for marine fishermen. Give short, helpful advice about fishing, weather, and sea conditions."
        if req.language == "ar":
            system_prompt += " Respond in Arabic."
        elif req.language == "fr":
            system_prompt += " Respond in French."
        else:
            system_prompt += " Respond in English."
            
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[req.message],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
            )
        )
        return {"response": response.text}
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {"response": "Sorry, I am having trouble connecting right now."}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Serve Frontend ---
# Mount the built frontend static assets (JS, CSS, images)
frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    # Serve index.html for ALL other routes (SPA catch-all)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
