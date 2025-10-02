"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  videoFile: File;
  videoDuration: number;
  videoResolution: { width: number; height: number };
  onSelectionComplete: (box: { x: number; y: number; w: number; h: number }) => void;
  onBack: () => void;
};

export default function WatermarkSelector({
  videoFile,
  videoDuration,
  videoResolution,
  onSelectionComplete,
  onBack,
}: Props) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedBox, setSelectedBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // 캔버스에 비디오 프레임과 박스 그리기
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !isVideoLoaded) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // 비디오 크기에 맞춰 캔버스 크기 조정
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 선택된 박스 그리기
      if (selectedBox) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedBox.x, selectedBox.y, selectedBox.w, selectedBox.h);
        
        // 반투명 오버레이
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.fillRect(selectedBox.x, selectedBox.y, selectedBox.w, selectedBox.h);

        // 라벨
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 16px Arial";
        ctx.fillText("워터마크 영역", selectedBox.x, selectedBox.y - 10);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedBox, isVideoLoaded]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setSelectedBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const pos = getMousePos(e);
    const box = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    };
    setSelectedBox(box);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleConfirm = () => {
    if (!selectedBox || !canvasRef.current) {
      alert("워터마크 영역을 선택해주세요.");
      return;
    }

    // 캔버스 크기를 실제 비디오 해상도로 변환
    const canvas = canvasRef.current;
    const scaleX = videoResolution.width / canvas.width;
    const scaleY = videoResolution.height / canvas.height;

    const actualBox = {
      x: Math.round(selectedBox.x * scaleX),
      y: Math.round(selectedBox.y * scaleY),
      w: Math.round(selectedBox.w * scaleX),
      h: Math.round(selectedBox.h * scaleY),
    };

    onSelectionComplete(actualBox);
  };

  const handleReset = () => {
    setSelectedBox(null);
    setStartPos(null);
  };

  // 빠른 선택 버튼 (일반적인 워터마크 위치)
  const handleQuickSelect = (position: string) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const w = Math.round(canvas.width * 0.2); // 20% 너비
    const h = Math.round(canvas.height * 0.1); // 10% 높이
    const padding = 20;

    let box: { x: number; y: number; w: number; h: number };

    switch (position) {
      case "bottom-right":
        box = { x: canvas.width - w - padding, y: canvas.height - h - padding, w, h };
        break;
      case "bottom-left":
        box = { x: padding, y: canvas.height - h - padding, w, h };
        break;
      case "top-right":
        box = { x: canvas.width - w - padding, y: padding, w, h };
        break;
      case "top-left":
        box = { x: padding, y: padding, w, h };
        break;
      case "bottom-center":
        box = { x: (canvas.width - w) / 2, y: canvas.height - h - padding, w, h };
        break;
      default:
        return;
    }

    setSelectedBox(box);
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
          2. 워터마크 영역 선택
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          ← 뒤로
        </button>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
          💡 <strong>사용 방법:</strong> 비디오에서 워터마크가 있는 영역을 마우스로 드래그하거나, 아래 버튼으로 빠르게 선택하세요.
        </p>
        
        {/* 빠른 선택 버튼 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">빠른 선택:</p>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => handleQuickSelect("top-left")}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
            >
              ↖️ 좌상
            </button>
            <button
              onClick={() => handleQuickSelect("top-right")}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
            >
              ↗️ 우상
            </button>
            <button
              onClick={() => handleQuickSelect("bottom-left")}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
            >
              ↙️ 좌하
            </button>
            <button
              onClick={() => handleQuickSelect("bottom-right")}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
            >
              ↘️ 우하
            </button>
            <button
              onClick={() => handleQuickSelect("bottom-center")}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
            >
              ⬇️ 하중
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">파일명:</span>
            <p className="font-medium text-gray-900 dark:text-white truncate">{videoFile.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">길이:</span>
            <p className="font-medium text-gray-900 dark:text-white">{formatTime(videoDuration)}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">해상도:</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {videoResolution.width}x{videoResolution.height}
            </p>
          </div>
        </div>
      </div>

      {/* 비디오 캔버스 */}
      <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>비디오 로딩 중...</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full opacity-0 absolute"
          controls={false}
          loop
          onLoadedMetadata={() => {
            if (videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              // 첫 프레임 표시
              video.currentTime = 0.1;
            }
          }}
          onLoadedData={() => {
            setIsVideoLoaded(true);
          }}
        />
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ display: isVideoLoaded ? 'block' : 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* 비디오 컨트롤 */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => videoRef.current?.play()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
        >
          ▶️ 재생
        </button>
        <button
          onClick={() => videoRef.current?.pause()}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm"
        >
          ⏸️ 일시정지
        </button>
        <button
          onClick={handleReset}
          disabled={!selectedBox}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
        >
          🔄 다시 선택
        </button>
      </div>

      {/* 선택 정보 */}
      {selectedBox && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-medium text-green-900 dark:text-green-200 mb-2">
            ✅ 워터마크 영역 선택됨
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-green-800 dark:text-green-300">
            <div>
              <span className="font-medium">위치:</span> ({Math.round(selectedBox.x)}, {Math.round(selectedBox.y)})
            </div>
            <div>
              <span className="font-medium">크기:</span> {Math.round(selectedBox.w)} x {Math.round(selectedBox.h)}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selectedBox}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
      >
        {selectedBox ? "✅ 선택 완료 - 다음 단계" : "⬆️ 워터마크 영역을 선택하세요"}
      </button>
    </div>
  );
}

