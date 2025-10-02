"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type { Detection } from "@/app/page";

type TrackingData = {
  ts: string;
  box: { x: number; y: number; w: number; h: number };
  confidence: number;
}[];

type Props = {
  videoFile: File;
  selectedBox: { x: number; y: number; w: number; h: number };
  trackingData?: TrackingData | null;
  isAiTracked?: boolean;
  videoResolution: { width: number; height: number };
  onBack: () => void;
  onComplete: () => void;
};

export default function VideoProcessor({
  videoFile,
  selectedBox,
  trackingData,
  isAiTracked,
  videoResolution,
  onBack,
  onComplete,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [removalMethod, setRemovalMethod] = useState<"delogo" | "boxblur">("delogo");

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

      // 입력 파일 작성 (File 객체를 직접 Uint8Array로 변환)
      addLog("📁 입력 파일 읽는 중...");
      const fileData = await videoFile.arrayBuffer();
      await ffmpeg.writeFile("input.mp4", new Uint8Array(fileData));
      addLog("✅ 입력 파일 준비 완료");

      // AI 추적 데이터가 있으면 타임스탬프별 필터 적용
      let filterComplex = "";
      
      if (isAiTracked && trackingData && trackingData.length > 0) {
        addLog(`🤖 AI 추적 모드: ${trackingData.length}개 프레임 처리`);
        
        // 타임스탬프별로 다른 위치의 워터마크 제거
        const filters: string[] = [];
        
        trackingData.forEach((track, idx) => {
          const { x, y, w, h } = track.box;
          const [mins, secs] = track.ts.split(":").map(Number);
          const timeInSeconds = mins * 60 + secs;
          
          if (removalMethod === "delogo") {
            // 각 타임스탬프에서 활성화되는 delogo 필터
            filters.push(`delogo=x=${x}:y=${y}:w=${w}:h=${h}:band=2:enable='between(t,${timeInSeconds},${timeInSeconds + 0.5})'`);
          }
        });
        
        if (removalMethod === "delogo") {
          filterComplex = filters.join(',');
          addLog("📐 방법: delogo (타임스탬프별 추적)");
        } else {
          // BoxBlur는 단순화 (첫 번째 위치만 사용)
          const { x, y, w, h } = trackingData[0].box;
          filterComplex = `[0:v]split[original][blur];[blur]crop=${w}:${h}:${x}:${y},boxblur=10:2[blurred];[original][blurred]overlay=${x}:${y}`;
          addLog("📐 방법: boxblur (첫 번째 위치 기준)");
        }
      } else {
        // 수동 모드: 고정 위치
        const { x, y, w, h } = selectedBox;
        addLog(`🎯 워터마크 영역: x=${x}, y=${y}, w=${w}, h=${h}`);

        if (removalMethod === "delogo") {
          filterComplex = `delogo=x=${x}:y=${y}:w=${w}:h=${h}:band=2`;
          addLog("📐 방법: delogo (로고 제거 최적화)");
        } else {
          filterComplex = `[0:v]split[original][blur];[blur]crop=${w}:${h}:${x}:${y},boxblur=10:2[blurred];[original][blurred]overlay=${x}:${y}`;
          addLog("📐 방법: boxblur (선택 영역만 블러)");
        }
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
      const blob = new Blob([data as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setDownloadUrl(url);

      setProgress(100);
      addLog("🎉 처리 완료! 미리보기를 확인하세요");
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
          3. 워터마크 제거
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
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">처리 대상:</span>
            <p className="font-medium text-gray-900 dark:text-white truncate">{videoFile.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">워터마크 영역:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedBox.w} x {selectedBox.h}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">모드:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {isAiTracked ? `🤖 AI 추적 (${trackingData?.length || 0}프레임)` : "📍 수동 선택"}
            </p>
          </div>
        </div>

        {!isProcessing && !downloadUrl && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                제거 방법 선택:
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="delogo"
                    checked={removalMethod === "delogo"}
                    onChange={(e) => setRemovalMethod(e.target.value as "delogo")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Delogo</strong> - 로고 제거 전용 (자연스러움 ⭐⭐⭐⭐)
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="boxblur"
                    checked={removalMethod === "boxblur"}
                    onChange={(e) => setRemovalMethod(e.target.value as "boxblur")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>BoxBlur</strong> - 강력한 블러 (확실함 ⭐⭐⭐⭐⭐)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

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

      {/* 처리 완료 메시지 */}
      {downloadUrl && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-medium text-green-900 dark:text-green-200 mb-2">
            ✅ 처리 완료!
          </h3>
          <p className="text-sm text-green-800 dark:text-green-300 mb-3">
            워터마크가 제거되었습니다. 다운로드하여 결과를 확인하세요.
          </p>
          
          {/* 미리보기 토글 버튼 */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-green-700 dark:text-green-300 hover:underline"
          >
            {showPreview ? "📹 미리보기 숨기기" : "📹 브라우저에서 미리보기 (선택사항)"}
          </button>
          
          {/* 선택적 미리보기 */}
          {showPreview && previewUrl && (
            <div className="mt-4">
              <video
                key={previewUrl}
                controls
                loop
                preload="metadata"
                playsInline
                muted
                className="w-full rounded-lg bg-black"
                onError={(e) => {
                  console.error("Video preview error:", e);
                  addLog("⚠️ 미리보기 재생 실패 - 다운로드 후 확인해주세요");
                }}
              >
                <source src={previewUrl} type="video/mp4" />
                브라우저가 비디오 재생을 지원하지 않습니다. 다운로드하여 확인해주세요.
              </video>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                💡 미리보기가 재생되지 않으면 다운로드하여 확인하세요
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
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
          <>
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
          </>
        )}
      </div>

      {!downloadUrl && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 처리 방법 안내</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• <strong>Delogo</strong>: 주변 픽셀로 워터마크 영역을 자연스럽게 채움</li>
            <li>• <strong>BoxBlur</strong>: 선택한 영역만 강력한 블러 처리 (배경은 선명)</li>
            {isAiTracked && (
              <li className="text-purple-700 dark:text-purple-300">
                • <strong>🤖 AI 추적 모드</strong>: 이동하는 워터마크를 자동으로 따라가며 제거
              </li>
            )}
            <li>• 처리 완료 후 다운로드하여 결과 확인</li>
            <li>• 만족스럽지 않으면 뒤로가기 후 다시 처리</li>
          </ul>
        </div>
      )}
    </div>
  );
}

