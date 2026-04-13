from typing import Dict, List
import re
from app.core.config import settings

class ModerationService:
    def __init__(self):
        self.threshold = settings.MODERATION_THRESHOLD
        
        # Define keyword patterns for different categories
        self.patterns = {
            "hate": [
                r"\b(hate|racist|sexist|discriminat)\w*\b",
                r"\b(slur|offensive|derogatory)\w*\b"
            ],
            "violence": [
                r"\b(kill|murder|attack|assault|harm|hurt|weapon)\w*\b",
                r"\b(fight|beat|strike|punch|shoot)\w*\b"
            ],
            "weapons": [
                r"\b(gun|rifle|pistol|knife|bomb|explosive)\w*\b",
                r"\b(weapon|ammunition|firearm)\w*\b"
            ],
            "religion": [
                # Monitor but don't necessarily block educational religious content
                r"\b(extremis|radical|terrorist)\w*\b"
            ],
            "safety": [
                r"\b(danger|unsafe|risk|hazard|threat)\w*\b",
                r"\b(accident|injury|death)\w*\b"
            ],
            "health": [
                r"\b(drug|alcohol|substance|addiction)\w*\b",
                r"\b(suicide|self-harm|overdose)\w*\b"
            ],
            "harassment": [
                r"\b(bully|harass|intimidat|threaten)\w*\b",
                r"\b(stalk|abuse|torment)\w*\b"
            ],
            "sexual": [
                r"\b(sex|sexual|porn|explicit|nude)\w*\b",
                r"\b(intimate|erotic|adult)\w*\b"
            ]
        }

    async def moderate_content(self, content: str, settings_override: Dict = None) -> Dict:
        """
        Moderate content for inappropriate material
        Returns: {
            "passed": bool,
            "category": str,
            "confidence": float,
            "warnings": List[str]
        }
        """
        content_lower = content.lower()
        warnings = []
        max_confidence = 0.0
        flagged_category = None
        
        for category, patterns in self.patterns.items():
            matches = []
            for pattern in patterns:
                found = re.findall(pattern, content_lower, re.IGNORECASE)
                matches.extend(found)
            
            if matches:
                # Calculate confidence based on number and type of matches
                confidence = min(len(matches) * 0.2, 1.0)
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    flagged_category = category
                
                # Educational context detection
                educational_keywords = ["learn", "study", "understand", "history", "literature", "science"]
                is_educational = any(kw in content_lower for kw in educational_keywords)
                
                # Adjust confidence if content appears educational
                if is_educational:
                    confidence *= 0.5
                
                threshold = settings_override.get(category, self.threshold) if settings_override else self.threshold
                
                if confidence >= threshold:
                    warnings.append(f"Content flagged for {category} (confidence: {confidence:.2f})")
        
        passed = len(warnings) == 0
        
        return {
            "passed": passed,
            "category": flagged_category or "none",
            "confidence": max_confidence,
            "warnings": warnings
        }

    async def moderate_batch(self, contents: List[str]) -> List[Dict]:
        """Moderate multiple contents"""
        results = []
        for content in contents:
            result = await self.moderate_content(content)
            results.append(result)
        return results

    def get_moderation_summary(self, results: List[Dict]) -> Dict:
        """Get summary of moderation results"""
        total = len(results)
        flagged = sum(1 for r in results if not r["passed"])
        
        categories = {}
        for result in results:
            if not result["passed"]:
                category = result["category"]
                categories[category] = categories.get(category, 0) + 1
        
        return {
            "total_checked": total,
            "total_flagged": flagged,
            "pass_rate": (total - flagged) / total if total > 0 else 1.0,
            "categories": categories
        }

moderation_service = ModerationService()
