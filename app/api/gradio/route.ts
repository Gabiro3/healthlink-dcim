import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { img_path, patient_name, doctor_notes } = body;

    console.log("Received Data:", { img_path, patient_name, doctor_notes });

    // Decode Base64 image
    const base64Data = img_path.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Use OS temp directory
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `image-${Date.now()}.png`);

    fs.writeFileSync(tempFilePath, buffer);
    console.log("Saved Image to:", tempFilePath);

    // ✅ Read the image as a Blob before sending
    const imageBlob = new Blob([fs.readFileSync(tempFilePath)], { type: "image/jpeg" });

    // ✅ Send the Blob, NOT the file path
    const client = await Client.connect("pb01/healthlink-beta");
    const result = await client.predict("/predict_and_superimpose", {
      img_path: imageBlob, // ✅ Correct format
    });

    console.log("Gradio API Response:", result.data);
    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Gradio API Error:", error);
    return NextResponse.json(
      { error: "Failed to process image with AI", details: error },
      { status: 500 }
    );
  }
}
