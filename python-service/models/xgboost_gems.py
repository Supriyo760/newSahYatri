import numpy as np
from pydantic import BaseModel

class GemLocationRequest(BaseModel):
    # Base features that would theoretically be scraped/computed
    review_count: int
    average_rating: float
    distance_from_city_center_km: float
    social_media_mentions_30d: int
    tourist_density_index: float # 0.0 to 1.0 (1.0 = highly crowded)

def score_hidden_gem(request: GemLocationRequest) -> dict:
    """
    Scores a location to determine if it's a hidden gem vs a tourist spot.
    """
    density_penalty = request.tourist_density_index * 40
    distance_bonus = min(request.distance_from_city_center_km * 2, 20)
    rating_bonus = (request.average_rating / 5.0) * 30
    
    # "Hiddenness" - fewer reviews/mentions is better for gems, up to a point
    hiddenness = 0
    if 10 < request.review_count < 500:
        hiddenness = 20
    elif request.review_count <= 10:
        hiddenness = 5 # Might just be bad
        
    raw_score = rating_bonus + distance_bonus + hiddenness - density_penalty
    
    # Normalize 0 to 100
    gem_score = float(np.clip(raw_score + 30, 0, 100))
    
    is_gem = gem_score > 65
    
    return {
        "gem_score": round(gem_score, 1),
        "is_hidden_gem": is_gem,
        "classification": "HIDDEN_GEM" if is_gem else "TOURIST_SPOT"
    }
