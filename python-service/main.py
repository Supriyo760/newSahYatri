from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI(title="SahYatri AI/ML Service", version="1.0.0")

@app.get("/")
def read_root():
    return {"status": "online", "service": "SahYatri ML Brain"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

from models.clustering import ClusteringRequest, perform_group_clustering

@app.post("/api/ml/matching/cluster")
def cluster_users(request: ClusteringRequest):
    """
    Accepts a list of users and their embedding vectors, returning optimal group assignments.
    """
    if not request.users:
        raise HTTPException(status_code=400, detail="No users provided for clustering")
        
    try:
        groups = perform_group_clustering(request.users, request.target_group_size)
        return {"status": "success", "groups": groups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from models.random_forest import ConflictPredictionRequest, MedicalRiskRequest, predict_conflict_probability, assess_medical_risk

@app.post("/api/ml/matching/conflict")
def predict_conflict(request: ConflictPredictionRequest):
    prob = predict_conflict_probability(request.user_a_features, request.user_b_features)
    return {"conflict_probability": prob}

@app.post("/api/ml/medical/risk")
def calculate_medical_risk(request: MedicalRiskRequest):
    return assess_medical_risk(request)

from models.xgboost_gems import GemLocationRequest, score_hidden_gem

@app.post("/api/ml/itinerary/gem-score")
def evaluate_gem(request: GemLocationRequest):
    return score_hidden_gem(request)

from models.sentiment import SentimentRequest, analyze_chat_sentiment
from models.culinary import CulinaryMatchingRequest, match_restaurants

@app.post("/api/ml/chat/sentiment")
def analyze_sentiment(request: SentimentRequest):
    return analyze_chat_sentiment(request)

@app.post("/api/ml/culinary/match")
def get_culinary_matches(request: CulinaryMatchingRequest):
    return match_restaurants(request)




