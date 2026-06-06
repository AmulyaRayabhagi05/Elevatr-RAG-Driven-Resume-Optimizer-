import chromadb
import os

# 1. Setup the same path your SkillGap code uses
base_dir = os.path.dirname(os.path.abspath(__file__))
chroma_path = os.path.join(base_dir, "chroma_db")

# 2. Initialize Chroma
client = chromadb.PersistentClient(path=chroma_path)

# 3. Create the 'jobs' collection
try:
    collection = client.create_collection(name="jobs")
    print("✅ 'jobs' collection created!")
except:
    collection = client.get_collection(name="jobs")
    print("ℹ️ 'jobs' collection already exists.")

# 4. Add some sample course data so your module has something to "recommend"
collection.add(
    documents=[
        "Complete SQL Bootcamp for Data Science",
        "Python for Systems Analysis and Automation",
        "Advanced Communication and Presentation Skills",
        "Strategic Project Management Professional"
    ],
    metadatas=[
        {"title": "SQL Bootcamp", "source": "Udemy", "url": "https://udemy.com/sql"},
        {"title": "Python Automation", "source": "Coursera", "url": "https://coursera.org/python"},
        {"title": "Comm. Excellence", "source": "edX", "url": "https://edx.org/comm"},
        {"title": "PM Pro", "source": "LinkedIn", "url": "https://linkedin.com/pm"}
    ],
    ids=["id1", "id2", "id3", "id4"]
)

print("🚀 Mock data loaded. Your SkillGapAnalyzer is now ready to run!")