import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { translateText, detectLanguage } from '@/lib/i18n/translate';

// Simulated Chatbot Logic
export async function POST(req: NextRequest) {
  try {
    const { message, targetLang = 'en' } = await req.json();

    if (!message) {
      return errorResponse('BAD_REQUEST', 'Message is required', 400);
    }

    // 1. Detect language of incoming message (simulated)
    const detectedLang = await detectLanguage(message);
    
    // 2. Process intent (very basic MVP bot logic)
    const lowerMsg = message.toLowerCase();
    let responseText = "I'm your SahYatri travel assistant. How can I help you plan your trip or find local gems?";
    
    if (lowerMsg.includes('hospital') || lowerMsg.includes('emergency')) {
      responseText = "If this is a medical emergency, please use the SOS button immediately. Otherwise, I can help you find nearby pharmacies or clinics.";
    } else if (lowerMsg.includes('food') || lowerMsg.includes('hungry') || lowerMsg.includes('eat')) {
      responseText = "I can recommend some great local gems. Would you prefer street food, or a sit-down restaurant within your budget?";
    } else if (lowerMsg.includes('budget') || lowerMsg.includes('expense')) {
      responseText = "You can track group expenses in the Budget dashboard. Do you want me to calculate who owes who?";
    }

    // 3. Translate response back to user's preferred language
    const finalResponse = await translateText(responseText, targetLang);

    return NextResponse.json({
      reply: finalResponse,
      detectedLang
    });

  } catch (err) {
    console.error('Chatbot error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to process message', 500);
  }
}
