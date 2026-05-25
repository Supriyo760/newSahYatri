import csv
import random
import uuid
from datetime import datetime, timedelta

def generate_users(num_users=10000):
    users = []
    travel_styles = ['adventure', 'luxury', 'budget', 'cultural', 'relaxation']
    genders = ['male', 'female', 'non-binary']
    
    print(f"Generating {num_users} synthetic users...")
    
    for _ in range(num_users):
        user_id = str(uuid.uuid4())
        users.append({
            'id': user_id,
            'name': f"User_{user_id[:8]}",
            'age': random.randint(18, 65),
            'gender': random.choice(genders),
            'travel_style': random.choice(travel_styles),
            'budget_level': random.randint(1, 5),
            # Simulate 18-dim embedding vector for matching
            'embedding': [round(random.uniform(0, 1), 4) for _ in range(18)],
            'is_onboarded': True
        })
        
    return users

def generate_trips(num_trips=5000):
    trips = []
    statuses = ['planned', 'active', 'completed', 'cancelled']
    
    print(f"Generating {num_trips} synthetic trips...")
    
    for _ in range(num_trips):
        start_date = datetime.now() + timedelta(days=random.randint(1, 365))
        end_date = start_date + timedelta(days=random.randint(2, 14))
        
        trips.append({
            'id': str(uuid.uuid4()),
            'title': f"Synthetic Trip {random.randint(100, 999)}",
            'status': random.choices(statuses, weights=[0.4, 0.1, 0.4, 0.1])[0],
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'budget_limit': random.randint(500, 5000)
        })
        
    return trips

def export_to_csv(data, filename):
    if not data:
        return
        
    keys = data[0].keys()
    with open(filename, 'w', newline='') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)
    print(f"Exported {len(data)} records to {filename}")

if __name__ == "__main__":
    users = generate_users(10000)
    export_to_csv(users, "synthetic_users_10k.csv")
    
    trips = generate_trips(5000)
    export_to_csv(trips, "synthetic_trips_5k.csv")
    
    print("Dataset generation complete. Files saved to current directory.")
