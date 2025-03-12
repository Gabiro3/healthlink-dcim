// Interface for the API response
export interface AIAnalysisResult {
  confidence_score: number
  processing_time: number
  diagnosis: string
}

// Default values for when API fails or is loading
export const defaultAIResult: AIAnalysisResult = {
  diagnosis: "No diagnosis available",
  confidence_score: 0,
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
    // Convert the image blob to base64 for transmission
    const base64Image = await blobToBase64(imageBlob)

    // Prepare the payload for the API request
    const payload = {
      img_path: base64Image,
      patient_name: patientName,
      doctor_notes: doctorNotes,
    }

    // Call the Next.js API route
    const response = await fetch(`/api/gradio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API request failed: ${response.statusText}. ${errorData.error || ""}`)
    }

    // Parse the response
    const data = await response.json()

    // Assuming data is an array as described in the API response format
    const diagnosisResult = data[1] // 'Pneumonia Negative'
    const modelConfidence = data[2] // '97.70%'
    const computationTime = data[3] // '0.6324 seconds'

    // Structure the result in the format expected by AIAnalysisResult
    const result: AIAnalysisResult = {
      diagnosis: diagnosisResult,
      confidence_score: modelConfidence,
      processing_time: computationTime,
    }

    return result
  } catch (error) {
    console.error("Error processing image with AI:", error)
    throw error
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