import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

# Load the connection string from your local .env file
load_dotenv()
MONGO_URL = os.getenv("MONGO_URI")

def ingest_onet_data():
    print("Connecting to MongoDB Atlas...")
    client = MongoClient(MONGO_URL)
    
    # Connect to the main database
    db = client['elevatr_db']
    
    collection = db['onet_occupations']

    print("Loading O*NET JSON data...")
    file_path = os.path.join(os.path.dirname(__file__), '../../../onet_skill_gap_dataset.json')
    
    if not os.path.exists(file_path):
        print(f"Error: Could not find the JSON file at {file_path}")
        print("Please move your JSON file to the correct location or update the path.")
        return

    with open(file_path, 'r') as file:
        occupations_data = json.load(file)

    print(f"Inserting {len(occupations_data)} records into the 'onet_occupations' collection...")
    
    collection.delete_many({}) 
    collection.insert_many(occupations_data)
    
    print("Success! O*NET dataset is live in MongoDB.")

if __name__ == "__main__":
    ingest_onet_data()



