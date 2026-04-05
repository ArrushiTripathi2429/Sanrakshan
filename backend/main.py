from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.analyze import router as analyze_router
from routes.priority import router as priority_router
from routes.early_warning import router as early_warning_router
from routes.weather import router as weather_router

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

@app.get("/")
def root():
    return {"status": "Sanrakshan AI backend running"}
