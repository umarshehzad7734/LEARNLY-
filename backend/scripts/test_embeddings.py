import asyncio
import os
import sys
import requests
import json
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv()

from app.core.config import settings

def test_rest():
    print("=== GEMINI REST API TEST ===")
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # 1. Single Test
    print("\n[1] Testing Single (REST)...")
    payload = {
        "model": "models/embedding-001",
        "content": {"parts": [{"text": "Hello world"}]}
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            emb = data.get("embedding", {}).get("values")
            if emb:
                print(f"SUCCESS: Vector Length {len(emb)}")
            else:
                print(f"FAILED: No embedding in response: {data}")
        else:
            print(f"FAILED: {response.text}")
    except Exception as e:
        print(f"ERROR: {str(e)}")

    # 2. Batch Test (Simulated via batchEmbedContents)
    print("\n[2] Testing Batch (REST)...")
    batch_url = f"https://generativelanguage.googleapis.com/v1beta/models/embedding-001:batchEmbedContents?key={api_key}"
    batch_payload = {
        "requests": [
            {"model": "models/embedding-001", "content": {"parts": [{"text": "Item 1"}]}},
            {"model": "models/embedding-001", "content": {"parts": [{"text": "Item 2"}]}}
        ]
    }
    
    try:
        response = requests.post(batch_url, headers=headers, json=batch_payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            embeddings = data.get("embeddings", [])
            print(f"SUCCESS: Got {len(embeddings)} vectors")
        else:
            print(f"FAILED: {response.text}")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_rest()
