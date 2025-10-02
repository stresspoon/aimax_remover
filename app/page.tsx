"use client";

import { useState } from "react";
import VideoUploader from "@/components/VideoUploader";
import WatermarkDetector from "@/components/WatermarkDetector";
import WatermarkEditor from "@/components/WatermarkEditor";
import VideoProcessor from "@/components/VideoProcessor";

export type Detection = {
  ts: string;
  boxes: Array<{
    label: string;
    box_2d: [number, number, number, number];
    score: number;
  }>;
};

export default function Home() {
  const [step, setStep] = useState<"upload" | "detect" | "edit" | "process">("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [detections, setDetections] = useState<Detection[]>([]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          🎬 워터마크 제거
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          AI 기반 이동 워터마크 자동 감지 및 제거
        </p>

        {/* 진행 단계 표시 */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-2">
            {["upload", "detect", "edit", "process"].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : idx < ["upload", "detect", "edit", "process"].indexOf(step)
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 3 && <div className="w-16 h-1 bg-gray-300"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* 단계별 컴포넌트 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
          {step === "upload" && (
            <VideoUploader
              onVideoLoaded={(file, duration, width, height) => {
                setVideoFile(file);
                setVideoDuration(duration);
                setVideoResolution({ width, height });
                setStep("detect");
              }}
            />
          )}

          {step === "detect" && videoFile && (
            <WatermarkDetector
              videoFile={videoFile}
              videoDuration={videoDuration}
              onDetectionComplete={(detections) => {
                setDetections(detections);
                setStep("edit");
              }}
              onBack={() => setStep("upload")}
            />
          )}

          {step === "edit" && (
            <WatermarkEditor
              videoFile={videoFile!}
              detections={detections}
              videoResolution={videoResolution}
              videoDuration={videoDuration}
              onEditComplete={(editedDetections) => {
                setDetections(editedDetections);
                setStep("process");
              }}
              onBack={() => setStep("detect")}
            />
          )}

          {step === "process" && (
            <VideoProcessor
              videoFile={videoFile!}
              detections={detections}
              videoResolution={videoResolution}
              onBack={() => setStep("edit")}
              onComplete={() => {
                // 처리 완료 후 처음으로
                setStep("upload");
                setVideoFile(null);
                setDetections([]);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

