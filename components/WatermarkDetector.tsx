"use client";

import { useState } from "react";
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
    setIsDetecting(true);
    setProgress(10);
    setError(null);

    try {
      // FormData 생성
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("samplingFps", samplingFps.toString());

      setProgress(30);

      // 서버 API 호출
      const response = await fetch("/api/detect-watermark", {
        method: "POST",
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API 요청 실패");
      }

      const data = await response.json();
      const detections: Detection[] = data.detections;

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

