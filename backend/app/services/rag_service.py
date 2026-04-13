import os
import faiss
import numpy as np
import pickle
from typing import List, Dict, Tuple, Optional
from pathlib import Path

from app.core.config import settings
from app.services.groq_service import groq_service
from app.services.huggingface_service import huggingface_service
# from app.services.ollama_service import ollama_service (Removed)
# from app.services.gemini_service import gemini_service (Removed)
from app.services.moderation_service import moderation_service
from app.services.document_parser import document_parser
from app.services.chunking_strategies import adaptive_chunker, Chunk
from app.services.search_utils import search_utils

class RAGService:
    def __init__(self):
        self.vector_store_path = Path(settings.VECTOR_STORE_PATH)
        self.vector_store_path.mkdir(exist_ok=True)
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP

    def extract_text_from_file(self, file_path: str) -> Dict:
        """
        Extract text from various file formats using advanced parser
        Returns dict with text, tables, images, and metadata
        """
        try:
            # Use advanced document parser
            parsed_doc = document_parser.parse(file_path)
            print(f"[RAG] Parsed document: {parsed_doc.get('metadata', {})}")
            return parsed_doc
        except Exception as e:
            print(f"[RAG ERROR] Error parsing {file_path}: {str(e)}")
            # Fallback to basic text extraction
            file_extension = Path(file_path).suffix.lower()
            try:
                if file_extension == '.txt':
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return {'text': f.read(), 'tables': [], 'images': [], 'metadata': {}}
            except:
                pass
            return {'text': '', 'tables': [], 'images': [], 'metadata': {}}

    def chunk_text(self, text: str, strategy: str = 'auto') -> List[Chunk]:
        """
        Split text into chunks using intelligent strategies
        
        Args:
            text: Text to chunk
            strategy: Chunking strategy ('auto', 'naive', 'semantic', 'hierarchical', 'table')
            
        Returns:
            List of Chunk objects with content and metadata
        """
        try:
            # Use dynamic chunking (None = auto-calculate optimal size)
            chunks = adaptive_chunker.chunk(
                text, 
                chunk_size=None,  # Auto-calculate based on document
                overlap=None,     # Auto-calculate based on chunk size
                strategy=strategy
            )
            print(f"[RAG] Created {len(chunks)} chunks using {strategy} strategy")
            return chunks
        except Exception as e:
            print(f"[RAG ERROR] Chunking failed: {str(e)}, falling back to naive chunking")
            # Fallback to simple chunking
            simple_chunks = []
            start = 0
            idx = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                chunk_text = text[start:end]
                simple_chunks.append(Chunk(
                    content=chunk_text,
                    start_pos=start,
                    end_pos=end,
                    chunk_index=idx,
                    metadata={'strategy': 'fallback'}
                ))
                start += self.chunk_size - self.chunk_overlap
                idx += 1
            return simple_chunks

    async def create_vector_store(self, course_id: int, file_path: str, material_title: str) -> str:
        """Create FAISS vector store from document with enhanced parsing and chunking"""
        print(f"[RAG] Starting vector store creation for: {material_title}")
        print(f"[RAG] Course ID: {course_id}, File: {file_path}")
        
        # Validate file exists
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            error_msg = f"File not found: {file_path}"
            print(f"[RAG ERROR] {error_msg}")
            raise FileNotFoundError(error_msg)
        
        print(f"[RAG] File exists, size: {file_path_obj.stat().st_size} bytes")
        
        # Extract text using advanced parser
        print(f"[RAG] Parsing document with advanced parser...")
        parsed_doc = self.extract_text_from_file(file_path)
        text = parsed_doc.get('text', '')
        
        if not text or len(text.strip()) == 0:
            error_msg = f"Could not extract text from file or file is empty: {file_path}"
            print(f"[RAG ERROR] {error_msg}")
            raise ValueError(error_msg)
        
        print(f"[RAG] Extracted {len(text)} characters of text")
        print(f"[RAG] Document metadata: {parsed_doc.get('metadata', {})}")
        
        # Chunk text using intelligent strategy with dynamic sizing
        print(f"[RAG] Chunking text with adaptive strategy (dynamic sizing enabled)...")
        chunks = self.chunk_text(text, strategy='auto')
        print(f"[RAG] Created {len(chunks)} chunks")
        
        if len(chunks) == 0:
            error_msg = "No chunks created from text"
            print(f"[RAG ERROR] {error_msg}")
            raise ValueError(error_msg)
        
        # Generate embeddings
        import asyncio
        embeddings = []
        chunk_contents = []
        chunk_metadata = []
        
        # Branch 1: Hugging Face (Prioritized Free Option)
        if settings.HUGGINGFACE_API_KEY:
            print(f"[RAG] Using Hugging Face Batch Embedding for {len(chunks)} chunks...")
            # HF typically accepts larger batches, but let's stick to safe 32-50
            BATCH_SIZE = 32
            
            all_texts = [c.content for c in chunks]
            
            for i in range(0, len(all_texts), BATCH_SIZE):
                batch_texts = all_texts[i:i + BATCH_SIZE]
                print(f"[RAG] Processing batch {i//BATCH_SIZE + 1} ({len(batch_texts)} chunks)...")
                
                batch_embeddings = await huggingface_service.embed_batch(batch_texts)
                
                if batch_embeddings:
                    embeddings.extend(batch_embeddings)
                    for j in range(len(batch_embeddings)):
                        chunk_idx = i + j
                        if chunk_idx < len(chunks):
                            chunk_contents.append(chunks[chunk_idx].content)
                            meta = chunks[chunk_idx].metadata
                            meta.update({
                                'chunk_index': chunks[chunk_idx].chunk_index,
                                'start_pos': chunks[chunk_idx].start_pos,
                                'end_pos': chunks[chunk_idx].end_pos,
                                'strategy': meta.get('strategy', 'unknown')
                            })
                            chunk_metadata.append(meta)
                else:
                    print(f"[RAG ERROR] HF Batch {i//BATCH_SIZE + 1} failed.")

        # Branch 2: Gemini (Removed as per request)
        # elif settings.GEMINI_API_KEY:
        #    ... (removed)
                    
        if not embeddings:
            error_msg = "Could not generate any embeddings. Check Hugging Face API configuration."
            print(f"[RAG ERROR] {error_msg}")
            raise ValueError(error_msg)
        
        print(f"[RAG] Successfully generated {len(embeddings)} embeddings")
        
        # Create FAISS index
        print(f"[RAG] Creating FAISS index...")
        try:
            dimension = len(embeddings[0])
            print(f"[RAG] Embedding dimension: {dimension}")
            index = faiss.IndexFlatL2(dimension)
            embeddings_array = np.array(embeddings).astype('float32')
            index.add(embeddings_array)
            print(f"[RAG] FAISS index created with {index.ntotal} vectors")
        except Exception as e:
            error_msg = f"Failed to create FAISS index: {str(e)}"
            print(f"[RAG ERROR] {error_msg}")
            raise ValueError(error_msg)
        
        # Save index and metadata
        vector_store_id = f"course_{course_id}_{material_title.replace(' ', '_')}"
        index_path = self.vector_store_path / f"{vector_store_id}.index"
        metadata_path = self.vector_store_path / f"{vector_store_id}_metadata.pkl"
        
        print(f"[RAG] Saving vector store...")
        print(f"[RAG] Index path: {index_path}")
        print(f"[RAG] Metadata path: {metadata_path}")
        
        try:
            faiss.write_index(index, str(index_path))
            print(f"[RAG] FAISS index saved successfully")
        except Exception as e:
            error_msg = f"Failed to save FAISS index: {str(e)}"
            print(f"[RAG ERROR] {error_msg}")
            raise ValueError(error_msg)
        
        try:
            metadata = {
                "chunks": chunk_contents,
                "chunk_metadata": chunk_metadata,
                "course_id": course_id,
                "material_title": material_title,
                "document_metadata": parsed_doc.get('metadata', {}),
                "has_tables": parsed_doc.get('metadata', {}).get('has_tables', False),
                "has_images": parsed_doc.get('metadata', {}).get('has_images', False)
            }
            with open(metadata_path, 'wb') as f:
                pickle.dump(metadata, f)
            print(f"[RAG] Metadata saved successfully")
        except Exception as e:
            error_msg = f"Failed to save metadata: {str(e)}"
            print(f"[RAG ERROR] {error_msg}")
            raise ValueError(error_msg)
        
        print(f"[RAG] [SUCCESS] Vector store created successfully: {vector_store_id}")
        return vector_store_id

    async def search_vector_store(self, course_id: str, query: str, top_k: int = 3, material_ids: List[str] = None) -> List[Dict]:
        """Search vector store for relevant documents, optionally filtered by material_ids"""
        from app.models.course import CourseMaterial
        from beanie import PydanticObjectId
        
        # If material_ids provided, get their vector_store_ids
        allowed_store_ids = None
        if material_ids:
            # Convert str IDs to PydanticObjectId if necessary, or Beanie handles str comparison? 
            # Ideally convert to PydanticObjectId for safety
            m_ids = [PydanticObjectId(mid) for mid in material_ids]
            materials = await CourseMaterial.find(
                {"_id": {"$in": m_ids}, "course_id": PydanticObjectId(course_id)}
            ).to_list()
            
            allowed_store_ids = {m.vector_store_id for m in materials if m.vector_store_id}
            print(f"Filtering by material_ids: {material_ids}")
            print(f"Allowed vector_store_ids: {allowed_store_ids}")
        
        # Find all vector stores for this course
        # Pattern: course_{course_id}_{title}.index
        # We need to match course_id carefully. 
        # Since course_id is now a string (ObjectId), the filename will contain it.
        # But we must ensure we don't pick up partial matches if we had integer IDs before?
        # Safe enough with prefix 'course_' + str(course_id) + '_'
        course_stores = list(self.vector_store_path.glob(f"course_{course_id}_*.index"))
        print(f"Found {len(course_stores)} vector stores for course {course_id}")
        
        if not course_stores:
            print(f"No vector stores found for course {course_id}!")
            return []
        
        all_results = []
        
        for store_path in course_stores:
            # Extract the vector_store_id from filename
            vector_store_id = store_path.stem
            
            # If material filtering is enabled, check if this store is allowed
            if allowed_store_ids is not None:
                if vector_store_id not in allowed_store_ids:
                    continue
                
            try:
                # Load index and metadata
                index = faiss.read_index(str(store_path))
                metadata_path = self.vector_store_path / f"{vector_store_id}_metadata.pkl"
                
                if not metadata_path.exists():
                    print(f"Metadata file not found: {metadata_path}")
                    continue
                
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
                
                # Generate query embedding
                query_embedding = None
                # Generate query embedding
                query_embedding = None
                
                # Priority 1: Hugging Face (Check and Error if missing)
                if settings.HUGGINGFACE_API_KEY:
                    query_embedding = await huggingface_service.embed(query)
                else:
                    print("[RAG ERROR] Hugging Face API key missing for search")
                    continue
                
                if not query_embedding:
                    print("Failed to generate query embedding")
                    continue
                
                # Search
                query_vector = np.array([query_embedding]).astype('float32')
                # Check valid count using index.ntotal instead of metadata length if safer
                # But metadata["chunks"] should track.
                num_chunks = len(metadata.get("chunks", []))
                if num_chunks == 0:
                    continue
                    
                distances, indices = index.search(query_vector, min(top_k, num_chunks))
                
                # Collect results
                for i, idx in enumerate(indices[0]):
                    if 0 <= idx < num_chunks:
                        all_results.append({
                            "content": metadata["chunks"][idx],
                            "score": float(1 / (1 + distances[0][i])),  # Convert distance to similarity
                            "metadata": {
                                "material": metadata.get("material_title", "Unknown"),
                                "course_id": str(metadata.get("course_id", ""))
                            }
                        })
            except Exception as e:
                print(f"Error searching vector store {store_path}: {str(e)}")
                continue
        
        # Sort by score and return top k
        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:top_k]

    async def query(self, query: str, course_id: str, conversation_history: List[Dict] = None, material_ids: List[str] = None, model_provider: str = "groq") -> Dict:
        """Query the RAG system with optional material filtering"""
        # Moderate the query
        moderation_result = await moderation_service.moderate_content(query)
        if not moderation_result["passed"]:
            return {
                "answer": "I cannot respond to this query as it violates our content policy.",
                "sources": [],
                "confidence": 0.0,
                "moderation_passed": False,
                "moderation_warnings": moderation_result["warnings"]
            }
        
        # Search for relevant documents - only from selected materials if provided
        relevant_docs = await self.search_vector_store(course_id, query, top_k=3, material_ids=material_ids)
        
        if not relevant_docs:
            return {
                "answer": "I don't have enough information in the course materials to answer this question. Please ask your teacher to upload relevant materials.",
                "sources": [],
                "confidence": 0.0,
                "moderation_passed": True,
                "moderation_warnings": []
            }
        
        # Build context from relevant documents
        context = "\n\n".join([doc["content"] for doc in relevant_docs])
        
        # Create prompt
        system_content = f"""You are a helpful AI Co-Instructor. Your role is to:
1. Answer questions based on the provided course materials
2. Be clear, concise, and educational
3. Cite sources when possible
4. Admit when you don't know something
5. Encourage critical thinking

Use the following context to answer the student's question:

Context from course materials:
{context}"""

        messages = [{"role": "system", "content": system_content}]
        
        # Build conversation history
        if conversation_history:
            messages.extend(conversation_history[-5:])  # Last 5 messages for context
        
        # Add current query
        messages.append({"role": "user", "content": query})
        
        # Generate response
        try:
            if settings.GROQ_API_KEY:
                print(f"[RAG] Using Groq API ({settings.GROQ_MODEL}) for generation...")
                answer = await groq_service.chat(messages)
            else:
                raise ValueError("Groq API key not set")
        except Exception as e:
            print(f"[RAG ERROR] Groq generation failed: {str(e)}")
            answer = "I'm sorry, I'm having trouble connecting to my AI core (Groq). Please check the API configuration."
        
        # Moderate the response
        response_moderation = await moderation_service.moderate_content(answer)
        
        # Calculate confidence based on relevance scores
        avg_confidence = sum(doc["score"] for doc in relevant_docs) / len(relevant_docs) if relevant_docs else 0.0
        
        return {
            "answer": answer,
            "sources": [
                {
                    "content": doc["content"][:200] + "...",  # Truncate for display
                    "score": doc["score"],
                    "metadata": doc["metadata"]
                }
                for doc in relevant_docs
            ],
            "confidence": avg_confidence,
            "moderation_passed": response_moderation["passed"],
            "moderation_warnings": response_moderation["warnings"]
        }

    async def get_materials_text(self, course_id: str, material_ids: List[str]) -> str:
        """Fetch the combined text content of specific materials directly from metadata"""
        from app.models.course import CourseMaterial
        from beanie import PydanticObjectId
        import pickle
        
        m_ids = [PydanticObjectId(mid) for mid in material_ids]
        materials = await CourseMaterial.find(
            {"_id": {"$in": m_ids}, "course_id": PydanticObjectId(course_id), "status": "completed"}
        ).to_list()
        
        combined_text = []
        for m in materials:
            if not m.vector_store_id:
                continue
            
            metadata_path = self.vector_store_path / f"{m.vector_store_id}_metadata.pkl"
            if metadata_path.exists():
                try:
                    with open(metadata_path, 'rb') as f:
                        metadata = pickle.load(f)
                        # Combine all chunks from this material
                        material_text = "\n".join(metadata.get("chunks", []))
                        combined_text.append(f"--- DOCUMENT: {m.title} ---\n{material_text}")
                except Exception as e:
                    print(f"[RAG ERROR] Failed to load metadata for {m.title}: {str(e)}")
        
        return "\n\n".join(combined_text)

rag_service = RAGService()
