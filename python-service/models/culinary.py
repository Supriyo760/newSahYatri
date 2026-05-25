import numpy as np
from pydantic import BaseModel
from typing import List

class UserFoodPrefs(BaseModel):
    preference_vector: List[float]
    
class RestaurantFeatures(BaseModel):
    restaurant_id: str
    feature_vector: List[float]

class CulinaryMatchingRequest(BaseModel):
    user: UserFoodPrefs
    restaurants: List[RestaurantFeatures]

def cosine_similarity(v1, v2):
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

def match_restaurants(request: CulinaryMatchingRequest) -> dict:
    """
    Ranks a list of restaurants against a user's food preference vector using Cosine Similarity.
    """
    user_vec = np.array(request.user.preference_vector)
    
    matches = []
    for rest in request.restaurants:
        rest_vec = np.array(rest.feature_vector)
        
        # Pad shorter vector with zeros if lengths mismatch
        if len(user_vec) != len(rest_vec):
            max_len = max(len(user_vec), len(rest_vec))
            u = np.pad(user_vec, (0, max_len - len(user_vec)))
            r = np.pad(rest_vec, (0, max_len - len(rest_vec)))
        else:
            u, r = user_vec, rest_vec
            
        sim = float(cosine_similarity(u, r))
        
        matches.append({
            "restaurant_id": rest.restaurant_id,
            "match_score": round(sim * 100, 1) # 0 to 100%
        })
        
    # Sort descending by match score
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "ranked_restaurants": matches
    }
