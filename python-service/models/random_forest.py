import numpy as np
from sklearn.ensemble import RandomForestClassifier
from pydantic import BaseModel
from typing import List

class ConflictPredictionRequest(BaseModel):
    user_a_features: List[float]
    user_b_features: List[float]

class MedicalRiskRequest(BaseModel):
    conditions: List[str]
    destination_type: str # e.g., 'high_altitude', 'tropical', 'urban'
    trip_duration_days: int

# In a real app, these models would be loaded from disk (e.g. .pkl files)
# For the MVP, we simulate the inference logic.
dummy_conflict_model = RandomForestClassifier(random_state=42)
# Simulating a trained model state for dummy inference
dummy_conflict_model.fit(np.array([[0,0], [1,1]]), [0, 1]) 

def predict_conflict_probability(features_a: List[float], features_b: List[float]) -> float:
    """
    Predicts the probability of conflict between two users based on their feature vectors.
    Returns a float between 0.0 (no conflict) and 1.0 (high conflict).
    """
    # Simulate feature difference
    arr_a = np.array(features_a)
    arr_b = np.array(features_b)
    
    # Ensure they are the same length
    if len(arr_a) != len(arr_b):
        min_len = min(len(arr_a), len(arr_b))
        arr_a = arr_a[:min_len]
        arr_b = arr_b[:min_len]
        
    diff = np.abs(arr_a - arr_b)
    
    # Simulate Random Forest inference (using arbitrary math for MVP)
    # The larger the difference in personality/budget, the higher the conflict probability
    base_prob = np.mean(diff) if len(diff) > 0 else 0.5
    
    # Bound between 0.05 and 0.95
    return float(np.clip(base_prob, 0.05, 0.95))

def assess_medical_risk(request: MedicalRiskRequest) -> dict:
    """
    Evaluates the medical risk for a user traveling to a specific destination.
    """
    risk_score = 0.1
    warnings = []
    
    for condition in request.conditions:
        cond_lower = condition.lower()
        if cond_lower in ['asthma', 'respiratory'] and request.destination_type == 'high_altitude':
            risk_score += 0.4
            warnings.append("High altitude may trigger asthma symptoms.")
        if cond_lower in ['heart_disease', 'cardiovascular'] and request.destination_type == 'high_altitude':
            risk_score += 0.5
            warnings.append("High altitude poses risks for cardiovascular conditions.")
        if cond_lower in ['diabetes'] and request.trip_duration_days > 7:
            risk_score += 0.2
            warnings.append("Extended trip duration requires strict insulin management.")
            
    risk_score = min(risk_score, 1.0)
    
    level = 'LOW'
    if risk_score > 0.4: level = 'MEDIUM'
    if risk_score > 0.7: level = 'HIGH'
    
    return {
        "risk_score": float(risk_score),
        "risk_level": level,
        "warnings": warnings
    }
