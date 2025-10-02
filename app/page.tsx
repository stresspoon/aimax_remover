"use client";

import { useState } from "react";
import VideoUploader from "@/components/VideoUploader";
import WatermarkSelector from "@/components/WatermarkSelector";
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
  const [step, setStep] = useState<"upload" | "select" | "process">("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [selectedBox, setSelectedBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          🎬 워터마크 제거
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          워터마크 영역을 직접 선택하여 전체 영상에서 제거
        </p>

        {/* 진행 단계 표시 */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-2">
            {[
              { key: "upload", label: "업로드" },
              { key: "select", label: "영역 선택" },
              { key: "process", label: "제거" },
            ].map((s, idx) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step === s.key
                        ? "bg-blue-600 text-white"
                        : idx < ["upload", "select", "process"].indexOf(step)
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">{s.label}</span>
                </div>
                {idx < 2 && <div className="w-16 h-1 bg-gray-300 mb-5"></div>}
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
                setStep("select");
              }}
            />
          )}

          {step === "select" && videoFile && (
            <WatermarkSelector
              videoFile={videoFile}
              videoDuration={videoDuration}
              videoResolution={videoResolution}
              onSelectionComplete={(box) => {
                setSelectedBox(box);
                setStep("process");
              }}
              onBack={() => setStep("upload")}
            />
          )}

          {step === "process" && videoFile && selectedBox && (
            <VideoProcessor
              videoFile={videoFile}
              selectedBox={selectedBox}
              videoResolution={videoResolution}
              onBack={() => setStep("select")}
              onComplete={() => {
                // 처리 완료 후 처음으로
                setStep("upload");
                setVideoFile(null);
                setSelectedBox(null);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

