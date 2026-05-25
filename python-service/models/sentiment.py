from pydantic import BaseModel
from typing import List

# In a real environment, we would load a HuggingFace pipeline:
# from transformers import pipeline
# sentiment_pipeline = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")

class ChatMessage(BaseModel):
    id: str
    content: str
    
class SentimentRequest(BaseModel):
    messages: List[ChatMessage]

def analyze_chat_sentiment(request: SentimentRequest) -> dict:
    """
    Analyzes an anonymous pre-match chat to detect toxicity, conflict, or high compatibility.
    """
    results = []
    total_score = 0.0
    
    # Mock sentiment analysis
    for msg in request.messages:
        text = msg.content.lower()
        score = 0.5 # Neutral
        
        # Simple heuristic for dummy logic
        positive_words = ['great', 'awesome', 'love', 'agree', 'yes', 'perfect', 'excited']
        negative_words = ['no', 'disagree', 'hate', 'stupid', 'bad', 'boring', 'don\'t']
        
        pos_count = sum(1 for w in positive_words if w in text)
        neg_count = sum(1 for w in negative_words if w in text)
        
        if pos_count > neg_count:
            score = min(0.5 + (pos_count * 0.1), 1.0)
        elif neg_count > pos_count:
            score = max(0.5 - (neg_count * 0.1), 0.0)
            
        total_score += score
        
        results.append({
            "message_id": msg.id,
            "sentiment_score": score
        })
        
    avg_score = total_score / len(request.messages) if request.messages else 0.5
    
    classification = "NEUTRAL"
    if avg_score > 0.7: classification = "POSITIVE"
    if avg_score < 0.3: classification = "NEGATIVE"
    
    return {
        "average_sentiment": avg_score,
        "classification": classification,
        "message_scores": results
    }
