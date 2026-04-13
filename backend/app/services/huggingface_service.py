import httpx
from typing import List, Optional
from app.core.config import settings
import asyncio
import random

class HuggingFaceService:
    def __init__(self):
        # Specific path for serverless inference on the router domain
        self.api_url = f"https://router.huggingface.co/hf-inference/models/{settings.HUGGINGFACE_EMBEDDING_MODEL}"
        self.headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"} if settings.HUGGINGFACE_API_KEY else {}

    async def embed(self, text: str) -> Optional[List[float]]:
        """Generate embedding for a single text"""
        res = await self.embed_batch([text])
        if res and len(res) > 0:
            return res[0]
        return None

    async def embed_batch(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Generate embeddings for a batch of texts"""
        if not settings.HUGGINGFACE_API_KEY:
            print("[HF WARN] No API Key set")
            return None

        retries = 5
        base_delay = 5

        async with httpx.AsyncClient() as client:
            for attempt in range(retries):
                try:
                    response = await client.post(
                        self.api_url, 
                        headers=self.headers, 
                        json={"inputs": texts, "options": {"wait_for_model": True}},
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                    
                    error = response.text
                    if "estimated_time" in error:
                        # Model is loading
                        wait_time = response.json().get("estimated_time", 10)
                        print(f"[HF INFO] Model loading, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                        
                    if response.status_code == 429:
                        wait = (base_delay * (2 ** attempt)) + (random.random() * 0.5)
                        print(f"[HF WARN] Rate limit. Waiting {wait:.2f}s...")
                        await asyncio.sleep(wait)
                        continue
                        
                    print(f"[HF ERROR] Status {response.status_code}: {error}")
                    return None

                except Exception as e:
                    print(f"[HF ERROR] Request failed: {str(e)}")
                    await asyncio.sleep(base_delay)
                    
        return None

huggingface_service = HuggingFaceService()
