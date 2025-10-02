import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const referenceBox = JSON.parse(formData.get("referenceBox") as string);
    const samplingFps = parseInt(formData.get("samplingFps") as string) || 2;

    if (!videoFile) {
      return NextResponse.json(
        { error: "비디오 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 비디오를 Base64로 변환
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");

    // Gemini API 호출
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
You are analyzing a video to track a watermark that may move across frames.

Reference watermark location (normalized 0-1000):
- Position: (${referenceBox.x}, ${referenceBox.y})
- Size: ${referenceBox.w} x ${referenceBox.h}

Task:
1. Sample the video at ${samplingFps} FPS
2. In each frame, find where the watermark appears (it may have moved)
3. Return a JSON array with the watermark position for each sampled timestamp

Output format:
[
  {
    "ts": "MM:SS",
    "box": {
      "x": 100,
      "y": 200,
      "w": 150,
      "h": 80
    },
    "confidence": 0.95
  }
]

Important:
- Track the SAME watermark pattern across all frames
- Coordinates should be pixel values (not normalized)
- If watermark is not visible in a frame, set confidence to 0
- The watermark may move, resize, or fade
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: videoFile.type,
          data: base64Data,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // JSON 파싱
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("API 응답에서 JSON을 찾을 수 없습니다.");
    }

    const trackingData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ trackingData });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "워터마크 추적 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

