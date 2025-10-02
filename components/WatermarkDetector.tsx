"use client";

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Detection } from "@/app/page";

type Props = {
  videoFile: File;
  videoDuration: number;
  onDetectionComplete: (detections: Detection[]) => void;
  onBack: () => void;
};

export default function WatermarkDetector({
  videoFile,
  videoDuration,
  onDetectionComplete,
  onBack,
}: Props) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [samplingFps, setSamplingFps] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const detectWatermarks = async () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API 키가 설정되지 않았습니다. .env.local 파일을 확인하세요.");
      return;
    }

    setIsDetecting(true);
    setProgress(10);
    setError(null);

    try {
      // 비디오 파일을 Base64로 변환
      const reader = new FileReader();
      const videoData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      setProgress(30);

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

      setProgress(50);

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: videoFile.type,
            data: videoData.split(",")[1],
          },
        },
      ]);

      setProgress(80);

      const response = await result.response;
      const text = response.text();

      // JSON 파싱
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("API 응답에서 JSON을 찾을 수 없습니다.");
      }

      const detections: Detection[] = JSON.parse(jsonMatch[0]);
      setProgress(100);

      setTimeout(() => {
        onDetectionComplete(detections);
      }, 500);
    } catch (err) {
      console.error("Detection error:", err);
      setError(err instanceof Error ? err.message : "워터마크 감지 중 오류가 발생했습니다.");
      setIsDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          2. 워터마크 감지
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          ← 뒤로
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">파일명:</span>
            <p className="font-medium text-gray-900 dark:text-white">{videoFile.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">길이:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, "0")}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            샘플링 FPS: {samplingFps}
          </label>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={samplingFps}
            onChange={(e) => setSamplingFps(Number(e.target.value))}
            disabled={isDetecting}
            className="w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            FPS가 높을수록 정확하지만 처리 시간이 길어집니다
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {isDetecting && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>AI 분석 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={detectWatermarks}
        disabled={isDetecting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
      >
        {isDetecting ? "감지 중..." : "🔍 워터마크 자동 감지 시작"}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Gemini 2.5 Flash 모델을 사용하여 전체 영상을 분석합니다
      </p>
    </div>
  );
}

