"use client";

import { useEffect, useRef, useState } from "react";
import type { Detection } from "@/app/page";

type Props = {
  videoFile: File;
  detections: Detection[];
  videoResolution: { width: number; height: number };
  videoDuration: number;
  onEditComplete: (editedDetections: Detection[]) => void;
  onBack: () => void;
};

type DenormalizedBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export default function WatermarkEditor({
  videoFile,
  detections,
  videoResolution,
  videoDuration,
  onEditComplete,
  onBack,
}: Props) {
  const [editedDetections, setEditedDetections] = useState<Detection[]>(detections);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // 좌표 역변환 함수
  const denormalize = (box: [number, number, number, number]): DenormalizedBox => {
    const [y1, x1, y2, x2] = box;
    return {
      x1: Math.round((x1 / 1000) * videoResolution.width),
      y1: Math.round((y1 / 1000) * videoResolution.height),
      x2: Math.round((x2 / 1000) * videoResolution.width),
      y2: Math.round((y2 / 1000) * videoResolution.height),
    };
  };

  // 캔버스에 워터마크 박스 그리기
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawBoxes = () => {
      // 비디오 프레임 그리기
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 현재 시간의 감지 결과 찾기
      const currentMinute = Math.floor(currentTime / 60);
      const currentSecond = Math.floor(currentTime % 60);
      const timeStr = `${String(currentMinute).padStart(2, "0")}:${String(currentSecond).padStart(2, "0")}`;

      editedDetections.forEach((detection, detectionIdx) => {
        if (detection.ts === timeStr) {
          detection.boxes.forEach((box, boxIdx) => {
            const denorm = denormalize(box.box_2d);
            const scaleX = canvas.width / videoResolution.width;
            const scaleY = canvas.height / videoResolution.height;

            ctx.strokeStyle = selectedBoxIndex === boxIdx ? "#ef4444" : "#3b82f6";
            ctx.lineWidth = 3;
            ctx.strokeRect(
              denorm.x1 * scaleX,
              denorm.y1 * scaleY,
              (denorm.x2 - denorm.x1) * scaleX,
              (denorm.y2 - denorm.y1) * scaleY
            );

            // 라벨 표시
            ctx.fillStyle = selectedBoxIndex === boxIdx ? "#ef4444" : "#3b82f6";
            ctx.font = "14px Arial";
            ctx.fillText(
              `${box.label} (${Math.round(box.score * 100)}%)`,
              denorm.x1 * scaleX,
              denorm.y1 * scaleY - 5
            );
          });
        }
      });
    };

    const interval = setInterval(drawBoxes, 100);
    return () => clearInterval(interval);
  }, [currentTime, editedDetections, selectedBoxIndex, videoResolution]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          3. 워터마크 편집
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          ← 뒤로
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 비디오 프리뷰 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full opacity-0 absolute"
              onTimeUpdate={handleTimeUpdate}
            />
            <canvas
              ref={canvasRef}
              width={videoResolution.width}
              height={videoResolution.height}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => videoRef.current?.play()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              ▶️ 재생
            </button>
            <button
              onClick={() => videoRef.current?.pause()}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
            >
              ⏸️ 일시정지
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>

          {/* 타임라인 히트맵 */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              감지 타임라인
            </h3>
            <div className="relative h-12 bg-gray-200 dark:bg-gray-600 rounded">
              {editedDetections.map((det, idx) => {
                const [mins, secs] = det.ts.split(":").map(Number);
                const time = mins * 60 + secs;
                const position = (time / videoDuration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-1 bg-red-500"
                    style={{ left: `${position}%` }}
                    title={det.ts}
                  />
                );
              })}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-600"
                style={{ left: `${(currentTime / videoDuration) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 감지 목록 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            감지된 워터마크 ({editedDetections.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {editedDetections.map((det, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {det.ts}
                  </span>
                  <button
                    onClick={() => {
                      setEditedDetections(editedDetections.filter((_, i) => i !== idx));
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    삭제
                  </button>
                </div>
                {det.boxes.map((box, boxIdx) => (
                  <div
                    key={boxIdx}
                    className="text-sm text-gray-600 dark:text-gray-300 pl-2 border-l-2 border-blue-500"
                  >
                    <div>{box.label}</div>
                    <div className="text-xs">신뢰도: {Math.round(box.score * 100)}%</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={() => onEditComplete(editedDetections)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            ✅ 편집 완료
          </button>
        </div>
      </div>
    </div>
  );
}

