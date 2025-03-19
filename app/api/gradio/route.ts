import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageBlob = formData.get("img_input") as Blob;

    if (!imageBlob) {
      throw new Error("Invalid image data");
    }

    const client = await Client.connect("pb01/healthlink-beta");
    const result = await client.predict("/predict_and_superimpose", {
      img_input: imageBlob, // ✅ Send the raw Blob directly
    });

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Gradio API Error:", error);
    return NextResponse.json(
      { error: "Failed to process image with AI", details: error },
      { status: 500 }
    );
  }
}

