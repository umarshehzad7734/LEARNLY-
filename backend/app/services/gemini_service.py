import google.generativeai as genai
from app.core.config import settings
from typing import List, Dict, Optional

class GeminiService:
    def __init__(self):
        # Configure the API key
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
            self.embedding_model = 'models/embedding-001'
        else:
            print("[WARN] GEMINI_API_KEY not set. Gemini service disabled.")

    async def embed(self, text: str) -> Optional[List[float]]:
        """
        Generate embeddings with Exponential Backoff for 429 errors.
        """
        if not settings.GEMINI_API_KEY:
            return None
        
        import asyncio
        import random
        
        retries = 5
        base_delay = 2
        
        for attempt in range(retries):
            try:
                # Gemini embedding API
                result = genai.embed_content(
                    model=self.embedding_model,
                    content=text,
                    task_type="retrieval_document",
                    title="Learnly Document"
                )
                return result['embedding']
                
            except Exception as e:
                error_str = str(e)
                # Check for quota errors (429) or Service Unavailable (503)
                if "429" in error_str or "quota" in error_str.lower() or "503" in error_str:
                    if attempt < retries - 1:
                        sleep_time = (base_delay * (2 ** attempt)) + (random.random() * 0.5)
                        print(f"[GEMINI WARN] Quota hit. Retrying in {sleep_time:.2f}s... (Attempt {attempt+1}/{retries})")
                        await asyncio.sleep(sleep_time)
                        continue
                
                # If not retriable or out of retries
                print(f"[GEMINI ERROR] Embedding failed after {attempt+1} attempts: {error_str}")
                return None
        return None

    async def embed_batch(self, texts: List[str]) -> Optional[List[List[float]]]:
        """
        Generate embeddings for a BATCH of texts using Exponential Backoff.
        Significantly faster than single calls.
        """
        if not settings.GEMINI_API_KEY:
            return None
        
        import asyncio
        import random
        
        retries = 5
        base_delay = 10 # Increased from 2 to 10 to match Gemini's 6s requirement
        
        # Gemini often accepts up to 100 items per batch.
        # We will assume 'texts' is already chunked to appropriate batch size (e.g. <100) by the caller.
        
        for attempt in range(retries):
            try:
                # Gemini embedding API supports batch via passing list to 'content'
                # or using batch_embed_contents if available. 
                # In 0.3.2 w/ GenerativeModel, passing list to embed_content typically works 
                # or finding the right method.
                # Let's try native batch support.
                
                result = genai.embed_content(
                    model=self.embedding_model,
                    content=texts,
                    task_type="retrieval_document",
                    title="Learnly Document"
                )
                
                # Result structure for batch: {'embedding': [[...], [...]]}
                return result['embedding']
                
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower() or "503" in error_str:
                    if attempt < retries - 1:
                        sleep_time = (base_delay * (2 ** attempt)) + (random.random() * 0.5)
                        print(f"[GEMINI WARN] Batch Quota hit. Retrying in {sleep_time:.2f}s... (Attempt {attempt+1}/{retries})")
                        await asyncio.sleep(sleep_time)
                        continue
                
                print(f"[GEMINI ERROR] Batch embedding failed after {attempt+1} attempts: {error_str}")
                return None
        return None

    async def chat(self, messages: List[Dict]) -> str:
        """
        Chat completion using Gemini Pro (Backup for Groq)
        """
        if not settings.GEMINI_API_KEY:
            return "Gemini API key not configured."

        try:
            # Convert OpenAI-style messages to Gemini history
            # This is a basic conversion, ideally handle history better
            prompt = messages[-1]['content']
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"[GEMINI ERROR] Generation failed: {str(e)}")
            return "I apologize, but I encountered an error generating the response."

gemini_service = GeminiService()
