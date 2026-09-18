from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.routers import (
    auth_router,
    dashboard_router,
    assets_router,
    heirs_router,
    will_router,
    trigger_router,
    heir_portal_router,
    notifications_router,
    vault_router
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Preload seed demo data if new
try:
    with SessionLocal() as db:
        seed_database(db)
except Exception as e:
    print(f"[Startup Warning] Seed check: {e}")

app = FastAPI(
    title="Vaaris - Digital Legacy Management API",
    description="Your Data. Your Wishes. Your Legacy. RESTful backend orchestrating digital asset handover, verification pipelines, and heir notifications.",
    version="1.0.0"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(dashboard_router.router, prefix="/api")
app.include_router(assets_router.router, prefix="/api")
app.include_router(heirs_router.router, prefix="/api")
app.include_router(will_router.router, prefix="/api")
app.include_router(trigger_router.router, prefix="/api")
app.include_router(heir_portal_router.router, prefix="/api")
app.include_router(notifications_router.router, prefix="/api")
app.include_router(vault_router.router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "Vaaris Digital Legacy Management",
        "tagline": "Your Data. Your Wishes. Your Legacy.",
        "status": "OPERATIONAL",
        "documentation": "/docs"
    }
