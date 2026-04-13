import httpx
from typing import List, Dict, Optional
from app.core.config import settings

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self._client = None

    async def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, json_mode: bool = False) -> str:
        """Chat using Groq API with fresh connection for every request"""
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set. Please add it to your .env file.")

        # Fresh client per request to avoid any session/timeout residue
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 2048 
                }
                
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}

                import time
                start_time = time.time()
                print(f"[GROQ] Sending request to {self.model} ({len(str(payload))} chars, json_mode={json_mode})...")

                response = await client.post(self.base_url, json=payload, headers=headers)
                
                elapsed = time.time() - start_time
                
                if response.status_code != 200:
                    print(f"[GROQ ERROR] Status: {response.status_code} in {elapsed:.2f}s, Body: {response.text}")
                    response.raise_for_status()
                    
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"[GROQ SUCCESS] Received {len(content)} characters in {elapsed:.2f}s")
                return content
                
            except Exception as e:
                print(f"[GROQ SERVICE ERROR] {str(e)}")
                raise e

    async def close(self):
        # Kept for compatibility, though we now use context managers
        pass

groq_service = GroqService()
