from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, process, embedding, search, retrieve

app = FastAPI(
    title="DocuMind AI"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(process.router)
app.include_router(embedding.router)
app.include_router(search.router)
app.include_router(retrieve.router)

@app.get("/")
def root():
    return {
        "project": "DocuMind AI",
        "status": "API is Running"
    }