import numpy as np
from sklearn.cluster import KMeans
from pydantic import BaseModel
from typing import List, Dict

class UserProfile(BaseModel):
    user_id: str
    features: List[float] # Personality + Travel Style + Budget embedding vector

class ClusteringRequest(BaseModel):
    users: List[UserProfile]
    target_group_size: int = 4

def perform_group_clustering(users: List[UserProfile], target_group_size: int) -> Dict[str, List[str]]:
    """
    Uses K-Means clustering to partition a pool of users into compatible travel groups.
    If there are too few users, just returns one group.
    """
    if len(users) <= target_group_size:
        return {"0": [u.user_id for u in users]}
        
    n_clusters = max(1, len(users) // target_group_size)
    
    # Extract features
    X = np.array([u.features for u in users])
    
    # In a real production system with thousands of users, we'd pre-train or update incrementally.
    # Here, we do ad-hoc clustering on the provided cohort.
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    labels = kmeans.fit_predict(X)
    
    groups = {}
    for user, label in zip(users, labels):
        cluster_id = str(label)
        if cluster_id not in groups:
            groups[cluster_id] = []
        groups[cluster_id].append(user.user_id)
        
    return groups
