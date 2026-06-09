import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export function successResponse(data: any, status = 200) {
  const requestId = nanoid();
  return NextResponse.json({
    data,
    meta: {
      requestId,
      source: "live",
      generatedAt: new Date().toISOString()
    }
  }, { status });
}

export function errorResponse(code: string, message: string, status = 400, details: any[] = []) {
  const requestId = nanoid();
  return NextResponse.json({
    error: {
      code,
      message,
      requestId,
      details
    }
  }, { status });
}
