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
Analyze this entire video for watermarks or logos that appear throughout the video.
Sample the video at ${samplingFps} FPS (frames per second).

Return a JSON array of detections with the following format:
[
  {
    "ts": "MM:SS",
    "boxes": [
      {
        "label": "watermark",
        "box_2d": [ymin, xmin, ymax, xmax],
        "score": 0.95
      }
    ]
  }
]

Coordinates should be normalized to 0-1000 range.
Only detect watermarks, logos, or text overlays that appear consistently across multiple frames.
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

    const detections = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ detections });
  } catch (error) {
    console.error("Detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "워터마크 감지 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

