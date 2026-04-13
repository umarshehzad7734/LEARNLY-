"""
Intelligent Chunking Strategies Module
Implements various chunking strategies from RAGFlow for better context preservation
"""

import re
from typing import List, Dict, Tuple
from dataclasses import dataclass


@dataclass
class Chunk:
    """Represents a text chunk with metadata"""
    content: str
    start_pos: int
    end_pos: int
    chunk_index: int
    metadata: Dict = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class ChunkingStrategy:
    """Base class for chunking strategies"""
    
    def chunk(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[Chunk]:
        """
        Chunk text according to strategy
        
        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters
            overlap: Overlap between chunks in characters
            
        Returns:
            List of Chunk objects
        """
        raise NotImplementedError


class NaiveChunker(ChunkingStrategy):
    """
    Simple character-based chunking with smart boundaries
    Tries to break at sentence or paragraph boundaries when possible
    """
    
    def chunk(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[Chunk]:
        """Chunk text with smart boundary detection"""
        chunks = []
        text_length = len(text)
        start = 0
        chunk_index = 0
        
        # Sentence boundary patterns
        sentence_endings = r'[.!?]\s+'
        paragraph_endings = r'\n\n+'
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            
            # If not at the end of text, try to find a good breaking point
            if end < text_length:
                # Look for paragraph break first
                search_start = max(start, end - 100)
                paragraph_match = None
                for match in re.finditer(paragraph_endings, text[search_start:end]):
                    paragraph_match = match
                
                if paragraph_match:
                    # Break at paragraph
                    end = search_start + paragraph_match.end()
                else:
                    # Look for sentence break
                    sentence_match = None
                    for match in re.finditer(sentence_endings, text[search_start:end]):
                        sentence_match = match
                    
                    if sentence_match:
                        # Break at sentence
                        end = search_start + sentence_match.end()
            
            # Extract chunk
            chunk_text = text[start:end].strip()
            
            if chunk_text:
                chunks.append(Chunk(
                    content=chunk_text,
                    start_pos=start,
                    end_pos=end,
                    chunk_index=chunk_index,
                    metadata={'strategy': 'naive'}
                ))
                chunk_index += 1
            
            # Move to next chunk with overlap
            if end >= text_length:
                break
                
            start = end - overlap
            if start >= text_length:
                break
            
            # Safety: ensure start always advances
            if start <= chunks[-1].start_pos and len(chunks) > 0:
                start = end
        
        return chunks


class SemanticChunker(ChunkingStrategy):
    """
    Semantic chunking that preserves sentence and paragraph boundaries
    More intelligent than naive chunking
    """
    
    def chunk(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[Chunk]:
        """Chunk text preserving semantic boundaries"""
        chunks = []
        
        # Split into paragraphs first
        paragraphs = re.split(r'\n\n+', text)
        
        current_chunk = ""
        current_start = 0
        chunk_index = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph exceeds chunk size
            if len(current_chunk) + len(para) > chunk_size and current_chunk:
                # Save current chunk
                chunks.append(Chunk(
                    content=current_chunk.strip(),
                    start_pos=current_start,
                    end_pos=current_start + len(current_chunk),
                    chunk_index=chunk_index,
                    metadata={'strategy': 'semantic', 'type': 'paragraph'}
                ))
                chunk_index += 1
                
                # Start new chunk with overlap
                if overlap > 0:
                    # Take last few sentences for overlap
                    sentences = re.split(r'[.!?]\s+', current_chunk)
                    overlap_text = '. '.join(sentences[-2:]) if len(sentences) > 1 else ""
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    current_chunk = para
                
                current_start = current_start + len(current_chunk) - len(para) - overlap
                # Safety: ensure current_start advances
                if current_start <= chunks[-1].start_pos:
                    current_start = current_start + len(para)
            else:
                # Add to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(Chunk(
                content=current_chunk.strip(),
                start_pos=current_start,
                end_pos=current_start + len(current_chunk),
                chunk_index=chunk_index,
                metadata={'strategy': 'semantic', 'type': 'paragraph'}
            ))
        
        return chunks


class HierarchicalChunker(ChunkingStrategy):
    """
    Hierarchical chunking that preserves document structure (headings, sections)
    Best for structured documents like markdown or documents with clear sections
    """
    
    def chunk(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[Chunk]:
        """Chunk text preserving hierarchical structure"""
        chunks = []
        
        # Detect heading patterns (Markdown-style and numbered)
        heading_patterns = [
            r'^#{1,6}\s+.+$',  # Markdown headings
            r'^\d+\.\s+.+$',    # Numbered sections
            r'^[A-Z][^.!?]*:$', # Title case with colon
        ]
        
        lines = text.split('\n')
        current_section = {
            'heading': '',
            'content': '',
            'start': 0,
            'level': 0
        }
        chunk_index = 0
        
        for i, line in enumerate(lines):
            is_heading = False
            heading_level = 0
            
            # Check if line is a heading
            for pattern in heading_patterns:
                if re.match(pattern, line.strip(), re.MULTILINE):
                    is_heading = True
                    # Determine heading level
                    if line.strip().startswith('#'):
                        heading_level = len(re.match(r'^#+', line.strip()).group())
                    else:
                        heading_level = 1
                    break
            
            if is_heading:
                # Save previous section if it exists
                if current_section['content'].strip():
                    section_text = current_section['heading'] + '\n' + current_section['content']
                    
                    # If section is too large, split it
                    if len(section_text) > chunk_size:
                        sub_chunks = self._split_large_section(section_text, chunk_size, overlap)
                        for sub_chunk in sub_chunks:
                            chunks.append(Chunk(
                                content=sub_chunk,
                                start_pos=current_section['start'],
                                end_pos=current_section['start'] + len(sub_chunk),
                                chunk_index=chunk_index,
                                metadata={
                                    'strategy': 'hierarchical',
                                    'heading': current_section['heading'],
                                    'level': current_section['level']
                                }
                            ))
                            chunk_index += 1
                    else:
                        chunks.append(Chunk(
                            content=section_text.strip(),
                            start_pos=current_section['start'],
                            end_pos=current_section['start'] + len(section_text),
                            chunk_index=chunk_index,
                            metadata={
                                'strategy': 'hierarchical',
                                'heading': current_section['heading'],
                                'level': current_section['level']
                            }
                        ))
                        chunk_index += 1
                
                # Start new section
                current_section = {
                    'heading': line.strip(),
                    'content': '',
                    'start': i,
                    'level': heading_level
                }
            else:
                # Add to current section
                current_section['content'] += line + '\n'
        
        # Add final section
        if current_section['content'].strip():
            section_text = current_section['heading'] + '\n' + current_section['content']
            chunks.append(Chunk(
                content=section_text.strip(),
                start_pos=current_section['start'],
                end_pos=current_section['start'] + len(section_text),
                chunk_index=chunk_index,
                metadata={
                    'strategy': 'hierarchical',
                    'heading': current_section['heading'],
                    'level': current_section['level']
                }
            ))
        
        return chunks
    
    def _split_large_section(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """Split a large section into smaller chunks"""
        chunks = []
        sentences = re.split(r'[.!?]\s+', text)
        
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Add overlap
                if overlap > 0:
                    words = current_chunk.split()
                    overlap_words = words[-min(overlap // 5, len(words)):]
                    new_chunk_start = sentence
                    current_chunk = ' '.join(overlap_words) + ' ' + sentence
                else:
                    current_chunk = sentence
            else:
                current_chunk += sentence + '. '
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks


class TableChunker(ChunkingStrategy):
    """
    Special chunking for tables
    Keeps table structure intact
    """
    
    def chunk(self, text: str, chunk_size: int = 512, overlap: int = 0) -> List[Chunk]:
        """Chunk tables while preserving structure"""
        chunks = []
        
        # Detect markdown tables
        table_pattern = r'\|.+\|[\r\n]+\|[\s\-:]+\|[\r\n]+(?:\|.+\|[\r\n]+)+'
        
        current_pos = 0
        chunk_index = 0
        
        for match in re.finditer(table_pattern, text, re.MULTILINE):
            # Add text before table
            before_text = text[current_pos:match.start()].strip()
            if before_text:
                # Use naive chunking for non-table text
                naive_chunker = NaiveChunker()
                before_chunks = naive_chunker.chunk(before_text, chunk_size, overlap)
                for chunk in before_chunks:
                    chunks.append(Chunk(
                        content=chunk.content,
                        start_pos=current_pos + chunk.start_pos,
                        end_pos=current_pos + chunk.end_pos,
                        chunk_index=chunk_index,
                        metadata={'strategy': 'table', 'type': 'text'}
                    ))
                    chunk_index += 1
            
            # Add table as single chunk
            table_text = match.group()
            chunks.append(Chunk(
                content=table_text,
                start_pos=match.start(),
                end_pos=match.end(),
                chunk_index=chunk_index,
                metadata={'strategy': 'table', 'type': 'table'}
            ))
            chunk_index += 1
            
            current_pos = match.end()
        
        # Add remaining text
        remaining_text = text[current_pos:].strip()
        if remaining_text:
            naive_chunker = NaiveChunker()
            remaining_chunks = naive_chunker.chunk(remaining_text, chunk_size, overlap)
            for chunk in remaining_chunks:
                chunks.append(Chunk(
                    content=chunk.content,
                    start_pos=current_pos + chunk.start_pos,
                    end_pos=current_pos + chunk.end_pos,
                    chunk_index=chunk_index,
                    metadata={'strategy': 'table', 'type': 'text'}
                ))
                chunk_index += 1
        
        return chunks


class AdaptiveChunker:
    """
    Adaptive chunker that selects the best strategy based on content
    """
    
    def __init__(self):
        self.strategies = {
            'naive': NaiveChunker(),
            'semantic': SemanticChunker(),
            'hierarchical': HierarchicalChunker(),
            'table': TableChunker()
        }
    
    def chunk(self, text: str, chunk_size: int = None, overlap: int = None, 
              strategy: str = 'auto') -> List[Chunk]:
        """
        Chunk text using the specified or auto-detected strategy with dynamic sizing
        
        Args:
            text: Text to chunk
            chunk_size: Target chunk size (auto-calculated if None)
            overlap: Overlap between chunks (auto-calculated if None)
            strategy: Strategy to use ('auto', 'naive', 'semantic', 'hierarchical', 'table')
        """
        # Auto-detect strategy if needed
        if strategy == 'auto':
            strategy = self._detect_best_strategy(text)
        
        if strategy not in self.strategies:
            strategy = 'naive'
        
        # Calculate dynamic chunk size based on document length
        if chunk_size is None:
            chunk_size = self._calculate_optimal_chunk_size(text, strategy)
        
        # Calculate dynamic overlap (ensure it's always smaller than chunk_size!)
        if overlap is None:
            # Use 15% overlap, but at least 20 chars and at most chunk_size - 20
            overlap = int(chunk_size * 0.15)
            if overlap < 20: overlap = min(20, chunk_size // 2)
        
        # Final safety check to prevent infinite loops
        if overlap >= chunk_size:
            overlap = chunk_size // 2
        
        return self.strategies[strategy].chunk(text, chunk_size, overlap)
    
    def _calculate_optimal_chunk_size(self, text: str, strategy: str) -> int:
        """Dynamically calculate optimal chunk size based on document characteristics"""
        text_length = len(text)
        
        # Base sizes for different strategies
        strategy_base_sizes = {
            'table': 1500,      # Tables need more context
            'hierarchical': 1200,  # Sections can be larger
            'semantic': 800,    # Paragraphs are medium
            'naive': 600        # Default fallback
        }
        
        base_size = strategy_base_sizes.get(strategy, 600)
        
        # Adjust based on document length
        if text_length < 2000:
            # Very short documents: smaller chunks for precision
            # Safety: Ensure chunk_size is at least 100
            return max(100, min(400, text_length // 3))
        elif text_length < 10000:
            # Short documents: use base size
            return base_size
        elif text_length < 50000:
            # Medium documents: slightly larger chunks
            return int(base_size * 1.3)
        else:
            # Large documents: larger chunks for efficiency
            return int(base_size * 1.5)

    
    def _detect_best_strategy(self, text: str) -> str:
        """Detect the best chunking strategy for the given text"""
        
        # Check for tables
        if re.search(r'\|.+\|[\r\n]+\|[\s\-:]+\|', text):
            return 'table'
        
        # Check for hierarchical structure (headings)
        heading_count = len(re.findall(r'^#{1,6}\s+.+$', text, re.MULTILINE))
        if heading_count > 2:
            return 'hierarchical'
        
        # Check for clear paragraph structure
        paragraph_count = len(re.split(r'\n\n+', text))
        if paragraph_count > 3:
            return 'semantic'
        
        # Default to naive
        return 'naive'


# Singleton instance
adaptive_chunker = AdaptiveChunker()
