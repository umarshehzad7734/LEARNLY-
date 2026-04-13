import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv()

async def diagnose_errors():
    mongo_url = os.getenv("MONGODB_URL")
    if not mongo_url:
        print("Error: MONGODB_URL missing")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client["learnly_db"]
    
    materials = await db["CourseMaterial"].find({"status": "failed"}).to_list(100)
    
    print("\n=== MATERIAL ERROR DIAGNOSTIC ===")
    print(f"Failed Materials Found: {len(materials)}")
    
    for m in materials:
        print(f"\nTitle: {m.get('title')}")
        print(f"Status: {m.get('status')}")
        print(f"Error: {m.get('index_error')}")
        print(f"File Path: {m.get('file_path')}")

if __name__ == "__main__":
    asyncio.run(diagnose_errors())
