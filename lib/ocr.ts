/* ─────────────────────────────────────────────────────────────
  OCR.space API integration for text extraction from images and PDFs
  ───────────────────────────────────────────────────────────── */

export interface OcrResult {
  text: string;
  error?: string;
}

interface OcrSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[];
  ParsedResults?: { ParsedText?: string }[];
}

/**
 * Extract text from base64-encoded image or PDF using OCR.space API
 * @param base64 - Base64 encoded file data (without data:image/ prefix)
 * @param filetype - Optional: 'PDF', 'JPG', 'PNG', etc. (auto-detected if not provided)
 * @returns Extracted text or error
 */
// Extract text from base64-encoded image or PDF using OCR.space API
export async function extractTextWithOcr(
  base64: string,
  filetype?: string
): Promise<OcrResult> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  console.log('[OCR DEBUG] API key present:', !!apiKey);
  if (!apiKey) {
    return { text: "", error: "OCR_SPACE_API_KEY not configured" };
  }

  // Remove data URI prefix if present
  const cleanBase64 = base64.replace(/^data:.+;base64,/, '');

  try {
    console.log('[OCR DEBUG] Original Base64 length:', base64.length);
    console.log('[OCR DEBUG] Clean Base64 length:', cleanBase64.length);
    console.log('[OCR DEBUG] Clean Base64 starts with:', cleanBase64.substring(0, 20));
    const formData = new FormData();
    formData.set('apikey', apiKey);
    formData.set('base64Image', cleanBase64);
    formData.set('language', 'eng'); // English - can be made configurable
    formData.set('isOverlayRequired', 'false');
    if (filetype) formData.set('filetype', filetype);

    // Add recommended parameters for better document processing
    formData.set('scale', 'true');
    formData.set('OCREngine', '2');

    console.log('[OCR DEBUG] Making request to OCR.space');
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
      // Note: Timeout can be handled by AbortController in calling code if needed
    });

    console.log('[OCR DEBUG] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[OCR DEBUG] Error response:', errorText);
      return {
        text: "",
        error: `OCR.space API error: ${response.status}`
      };
    }

    const data = (await response.json()) as OcrSpaceResponse;
    console.log('[OCR DEBUG] Response data:', data);

    if (data.IsErroredOnProcessing) {
      return {
        text: "",
        error: data.ErrorMessage?.join(', ') || 'Unknown OCR error'
      };
    }

    // Handle missing or empty ParsedResults
    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      return {
        text: "",
        error: "No text detected in document"
      };
    }

    // Extract text from all parsed results (handles multi-page documents)
    const textResults = data.ParsedResults
      ?.map((result) => result.ParsedText)
      .filter((text): text is string => Boolean(text)) ?? [];

    const extractedText = textResults.join('\n').trim();
    console.log('[OCR DEBUG] Extracted text length:', extractedText.length);

    return {
      text: extractedText || "",
      error: extractedText ? undefined : "No text detected in document"
    };
  } catch (err) {
    console.log('[OCR DEBUG] Catch error:', err);
    return {
      text: "",
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
