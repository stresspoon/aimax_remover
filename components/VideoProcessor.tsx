"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { Detection } from "@/app/page";

type Props = {
  videoFile: File;
  detections: Detection[];
  videoResolution: { width: number; height: number };
  onBack: () => void;
  onComplete: () => void;
};

export default function VideoProcessor({
  videoFile,
  detections,
  videoResolution,
  onBack,
  onComplete,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("log", ({ message }) => {
        setLog((prev) => [...prev.slice(-20), message]);
      });

      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setIsLoaded(true);
      addLog("✅ FFmpeg 로드 완료");
    } catch (error) {
      console.error("FFmpeg load error:", error);
      addLog("❌ FFmpeg 로드 실패");
    }
  };

  const addLog = (message: string) => {
    setLog((prev) => [...prev.slice(-20), message]);
  };

  const denormalize = (box: [number, number, number, number]) => {
    const [y1, x1, y2, x2] = box;
    return {
      x: Math.round((x1 / 1000) * videoResolution.width),
      y: Math.round((y1 / 1000) * videoResolution.height),
      w: Math.round(((x2 - x1) / 1000) * videoResolution.width),
      h: Math.round(((y2 - y1) / 1000) * videoResolution.height),
    };
  };

  const processVideo = async () => {
    if (!ffmpegRef.current || !isLoaded) {
      alert("FFmpeg가 아직 로드되지 않았습니다.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    addLog("🎬 영상 처리 시작...");

    try {
      const ffmpeg = ffmpegRef.current;

      // 입력 파일 작성
      await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));
      addLog("📁 입력 파일 준비 완료");

      // 워터마크 위치 계산 (첫 번째 감지 결과 사용)
      let filterComplex = "";
      if (detections.length > 0 && detections[0].boxes.length > 0) {
        const firstBox = detections[0].boxes[0];
        const { x, y, w, h } = denormalize(firstBox.box_2d);
        
        // delogo 필터 적용
        filterComplex = `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
        addLog(`🎯 워터마크 위치: x=${x}, y=${y}, w=${w}, h=${h}`);
      } else {
        throw new Error("감지된 워터마크가 없습니다.");
      }

      addLog("⚙️ FFmpeg 처리 중...");

      // FFmpeg 명령 실행
      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-vf",
        filterComplex,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "copy",
        "output.mp4",
      ]);

      addLog("✅ 처리 완료!");

      // 출력 파일 읽기
      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      setProgress(100);
      addLog("🎉 다운로드 준비 완료");
    } catch (error) {
      console.error("Processing error:", error);
      addLog(`❌ 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `removed_${videoFile.name}`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          4. 워터마크 제거
        </h2>
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white disabled:opacity-50"
        >
          ← 뒤로
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">처리 대상:</span>
            <p className="font-medium text-gray-900 dark:text-white">{videoFile.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">감지 수:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {detections.length}개 타임스탬프
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded p-3 max-h-48 overflow-y-auto font-mono text-xs">
          {log.map((line, idx) => (
            <div key={idx} className="text-gray-700 dark:text-gray-300">
              {line}
            </div>
          ))}
        </div>
      </div>

      {isProcessing && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>처리 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {!downloadUrl ? (
        <button
          onClick={processVideo}
          disabled={isProcessing || !isLoaded}
          className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
        >
          {!isLoaded
            ? "FFmpeg 로딩 중..."
            : isProcessing
            ? "처리 중..."
            : "🚀 워터마크 제거 시작"}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            ⬇️ 처리된 영상 다운로드
          </button>
          <button
            onClick={onComplete}
            className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            🔄 새 영상 처리하기
          </button>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 처리 방법</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• 클라이언트: FFmpeg.wasm delogo 필터 (빠른 처리)</li>
          <li>• 서버: Python 인페인팅 백엔드 (고품질, 별도 구현 필요)</li>
        </ul>
      </div>
    </div>
  );
}

