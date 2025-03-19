// Interface for the API response
export interface AIAnalysisResult {
  confidence_score: number
  processing_time: number
  imgUrl: string
  diagnosis: string
}

// Default values for when API fails or is loading
export const defaultAIResult: AIAnalysisResult = {
  diagnosis: "No diagnosis available",
  confidence_score: 0,
  imgUrl: "",
  processing_time: 0,
}

/**
 * Convert a Blob to a base64 string
 * @param blob The blob to convert
 * @returns A Promise that resolves to a base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

/**
 * Process an image through the Gradio AI diagnosis API via Next.js API route
 * @param imageBlob The image blob to analyze
 * @param patientName The patient name
 * @param doctorNotes Any notes from the doctor
 * @returns The AI analysis result
 */
export async function processImageWithAI(
  imageBlob: Blob,
  patientName: string,
  doctorNotes = "",
): Promise<AIAnalysisResult> {
  try {
    const formData = new FormData();
    formData.append("img_input", imageBlob, "image.jpeg");
    formData.append("patient_name", patientName);
    formData.append("doctor_notes", doctorNotes);

    const response = await fetch(`/api/gradio`, {
      method: "POST",
      body: formData, // ✅ Send FormData instead of converting to Base64
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      diagnosis: data[1],
      confidence_score: data[2],
      processing_time: data[3],
      imgUrl: data[0].url,
    };
  } catch (error) {
    console.error("Error processing image with AI:", error);
    throw error;
  }
}



/**
 * Convert a canvas element to a blob
 * @param canvas The canvas element to convert
 * @returns A Promise that resolves to a Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error("Failed to convert canvas to blob"))
      }
    }, "image/jpeg")
  })
}