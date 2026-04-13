"""
Search Utilities Module
Implements advanced search features from RAGFlow including hybrid search and reranking
"""

import re
from typing import List, Dict, Tuple
import numpy as np
from collections import Counter


class SearchUtils:
    """Utilities for advanced search and retrieval"""
    
    def __init__(self):
        pass
    
    def hybrid_similarity(self, query_embedding: List[float], doc_embeddings: List[List[float]],
                         query_tokens: List[str], doc_tokens_list: List[List[str]],
                         token_weight: float = 0.3, vector_weight: float = 0.7) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculate hybrid similarity combining vector and token-based similarity
        
        Args:
            query_embedding: Query vector embedding
            doc_embeddings: List of document vector embeddings
            query_tokens: Tokenized query
            doc_tokens_list: List of tokenized documents
            token_weight: Weight for token similarity (0-1)
            vector_weight: Weight for vector similarity (0-1)
            
        Returns:
            Tuple of (hybrid_scores, token_scores, vector_scores)
        """
        # Calculate vector similarity (cosine)
        vector_scores = self.cosine_similarity_batch(query_embedding, doc_embeddings)
        
        # Calculate token similarity
        token_scores = np.array([
            self.token_similarity(query_tokens, doc_tokens)
            for doc_tokens in doc_tokens_list
        ])
        
        # Combine scores
        hybrid_scores = token_weight * token_scores + vector_weight * vector_scores
        
        return hybrid_scores, token_scores, vector_scores
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def cosine_similarity_batch(self, query_vec: List[float], doc_vecs: List[List[float]]) -> np.ndarray:
        """Calculate cosine similarity between query and multiple documents"""
        query_vec = np.array(query_vec)
        doc_vecs = np.array(doc_vecs)
        
        # Normalize query
        query_norm = query_vec / (np.linalg.norm(query_vec) + 1e-10)
        
        # Normalize documents
        doc_norms = doc_vecs / (np.linalg.norm(doc_vecs, axis=1, keepdims=True) + 1e-10)
        
        # Calculate similarities
        similarities = np.dot(doc_norms, query_norm)
        
        return similarities
    
    def token_similarity(self, query_tokens: List[str], doc_tokens: List[str]) -> float:
        """
        Calculate token-based similarity using TF-IDF-like scoring
        
        Args:
            query_tokens: List of query tokens
            doc_tokens: List of document tokens
            
        Returns:
            Similarity score (0-1)
        """
        if not query_tokens or not doc_tokens:
            return 0.0
        
        # Convert to sets for intersection
        query_set = set(query_tokens)
        doc_set = set(doc_tokens)
        
        # Calculate intersection
        intersection = query_set.intersection(doc_set)
        
        if not intersection:
            return 0.0
        
        # Calculate term frequency in document
        doc_counter = Counter(doc_tokens)
        
        # Calculate score based on matched terms and their frequencies
        score = 0.0
        for term in intersection:
            # TF component
            tf = doc_counter[term] / len(doc_tokens)
            # IDF component (simplified - higher weight for rarer terms)
            idf = 1.0 / (1.0 + np.log(1.0 + doc_counter[term]))
            score += tf * idf
        
        # Normalize by query length
        score = score / len(query_tokens)
        
        # Boost for exact phrase matches
        query_text = ' '.join(query_tokens)
        doc_text = ' '.join(doc_tokens)
        if query_text.lower() in doc_text.lower():
            score *= 1.5
        
        # Clip to [0, 1]
        return min(score, 1.0)
    
    def expand_query(self, query: str) -> List[str]:
        """
        Expand query with synonyms and related terms
        
        Args:
            query: Original query
            
        Returns:
            List of expanded query terms
        """
        # Basic query expansion (can be enhanced with word embeddings or thesaurus)
        terms = query.lower().split()
        expanded = set(terms)
        
        # Add common variations
        for term in terms:
            # Remove punctuation
            clean_term = re.sub(r'[^\w\s]', '', term)
            if clean_term != term:
                expanded.add(clean_term)
            
            # Add plural/singular variations (simple heuristic)
            if term.endswith('s') and len(term) > 3:
                expanded.add(term[:-1])
            elif not term.endswith('s'):
                expanded.add(term + 's')
        
        return list(expanded)
    
    def rerank_results(self, results: List[Dict], query: str, 
                      top_k: int = 10) -> List[Dict]:
        """
        Rerank search results based on multiple factors
        
        Args:
            results: List of search results with 'content' and 'score' keys
            query: Original query
            top_k: Number of top results to return
            
        Returns:
            Reranked results
        """
        if not results:
            return []
        
        query_lower = query.lower()
        query_terms = set(query_lower.split())
        
        for result in results:
            content_lower = result.get('content', '').lower()
            
            # Base score
            base_score = result.get('score', 0.0)
            
            # Boost factors
            boosts = []
            
            # 1. Exact phrase match
            if query_lower in content_lower:
                boosts.append(0.3)
            
            # 2. Term coverage (how many query terms appear)
            content_terms = set(content_lower.split())
            term_coverage = len(query_terms.intersection(content_terms)) / len(query_terms)
            boosts.append(term_coverage * 0.2)
            
            # 3. Position of first match (earlier is better)
            first_match_pos = content_lower.find(query_lower)
            if first_match_pos >= 0:
                # Normalize position (0 = start, 1 = end)
                normalized_pos = first_match_pos / max(len(content_lower), 1)
                # Invert so earlier position gets higher score
                position_boost = (1 - normalized_pos) * 0.15
                boosts.append(position_boost)
            
            # 4. Term density (how concentrated are the matches)
            match_count = sum(content_lower.count(term) for term in query_terms)
            density = match_count / max(len(content_lower.split()), 1)
            boosts.append(density * 0.15)
            
            # Calculate final score
            total_boost = sum(boosts)
            result['rerank_score'] = base_score * (1 + total_boost)
        
        # Sort by rerank score
        reranked = sorted(results, key=lambda x: x.get('rerank_score', 0), reverse=True)
        
        return reranked[:top_k]
    
    def calculate_relevance_score(self, query: str, document: str, 
                                  embedding_score: float = None) -> float:
        """
        Calculate comprehensive relevance score
        
        Args:
            query: Search query
            document: Document content
            embedding_score: Optional pre-computed embedding similarity score
            
        Returns:
            Relevance score (0-1)
        """
        scores = []
        
        # 1. Embedding score (if provided)
        if embedding_score is not None:
            scores.append(embedding_score * 0.5)
        
        # 2. Token overlap
        query_tokens = set(query.lower().split())
        doc_tokens = set(document.lower().split())
        if query_tokens:
            overlap = len(query_tokens.intersection(doc_tokens)) / len(query_tokens)
            scores.append(overlap * 0.3)
        
        # 3. Exact match bonus
        if query.lower() in document.lower():
            scores.append(0.2)
        
        return sum(scores)
    
    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extract keywords from text using simple frequency analysis
        
        Args:
            text: Input text
            top_n: Number of top keywords to return
            
        Returns:
            List of keywords
        """
        # Remove punctuation and convert to lowercase
        clean_text = re.sub(r'[^\w\s]', ' ', text.lower())
        
        # Tokenize
        tokens = clean_text.split()
        
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
            'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        filtered_tokens = [t for t in tokens if t not in stop_words and len(t) > 2]
        
        # Count frequencies
        counter = Counter(filtered_tokens)
        
        # Return top N
        return [word for word, count in counter.most_common(top_n)]


# Singleton instance
search_utils = SearchUtils()
