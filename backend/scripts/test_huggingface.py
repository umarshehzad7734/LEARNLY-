import requests
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv()

def test_hf():
    print("=== HUGGING FACE API TEST ===")
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        print("ERROR: HUGGINGFACE_API_KEY not found in .env")
        return

    model = "BAAI/bge-small-en-v1.5"
    # Use the router path that worked for Auth
    url = f"https://router.huggingface.co/hf-inference/models/{model}"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    payload = {
        "inputs": ["Hello world", "Testing batch"]
    }

    print(f"Testing Model: {model}")
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 2:
                print(f"SUCCESS: Got {len(data)} vectors")
                print(f"Vector dim: {len(data[0])}")
            else:
                print(f"FAILED: Unexpected response format: {data}")
        elif response.status_code == 503:
             data = response.json()
             print(f"MODEL LOADING: Estimated time {data.get('estimated_time')}s")
        else:
            print(f"FAILED: {response.text}")

    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_hf()
