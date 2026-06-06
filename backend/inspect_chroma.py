# backend/inspect_chroma.py

import chromadb
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_PATH = os.path.join(BASE_DIR, "rag", "ingestion", "chroma_db")  # adjust if your path differs

client = chromadb.PersistentClient(path=CHROMA_PATH)
col = client.get_collection("jobs")

print("Total docs:", col.count())
results = col.get(limit=10, include=["metadatas", "documents"])
for meta, doc in zip(results["metadatas"], results["documents"]):
    print(meta, "---", doc[:80])