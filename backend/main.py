from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.analyze import router as analyze_router
from routes.priority import router as priority_router
from routes.early_warning import router as early_warning_router
from routes.weather import router as weather_router
from routes.village_profiles import router as village_profiles_router
from routes.overpass import router as overpass_router
from routes.volunteer_match import router as volunteer_match_router
from routes.vision import router as vision_router
from routes.discrepancy import router as discrepancy_router

load_dotenv()

app = FastAPI(title="Sanrakshan AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(priority_router, prefix="/api")
app.include_router(early_warning_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(village_profiles_router, prefix="/api")
app.include_router(overpass_router, prefix="/api")
app.include_router(volunteer_match_router, prefix="/api")
app.include_router(vision_router, prefix="/api")
app.include_router(discrepancy_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "Sanrakshan AI backend running"}
