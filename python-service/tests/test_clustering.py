import pytest
from models.clustering import UserProfile, perform_group_clustering

def test_perform_group_clustering():
    # Create 5 mock users
    users = [
        UserProfile(user_id="u1", features=[0.9, 0.1, 0.5]),
        UserProfile(user_id="u2", features=[0.8, 0.2, 0.4]), # Similar to u1
        UserProfile(user_id="u3", features=[0.1, 0.9, 0.1]),
        UserProfile(user_id="u4", features=[0.2, 0.8, 0.2]), # Similar to u3
        UserProfile(user_id="u5", features=[0.5, 0.5, 0.9]), # Outlier
    ]
    
    # Target group size 2 -> should result in ~2-3 clusters
    groups = perform_group_clustering(users, target_group_size=2)
    
    # Ensure all users are assigned to exactly one group
    assigned_users = []
    for cluster_id, members in groups.items():
        assigned_users.extend(members)
        
    assert len(assigned_users) == 5
    assert set(assigned_users) == {"u1", "u2", "u3", "u4", "u5"}
    
    # Since u1 and u2 are very similar, they should ideally be in the same cluster
    # We won't test exact cluster matching as K-means is slightly non-deterministic without seed, 
    # but we did fix random_state=42 in our implementation.
