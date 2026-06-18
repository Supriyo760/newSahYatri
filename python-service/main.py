from fastapi import FastAPI
import os
import uvicorn

app = FastAPI(title="SahYatri ML Dummy Service")

@app.get("/")
def read_root():
    return {"status": "online", "message": "SahYatri ML Service is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
