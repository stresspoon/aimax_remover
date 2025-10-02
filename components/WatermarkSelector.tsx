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
  const [isPainting, setIsPainting] = useState(false);
  const [paintedPixels, setPaintedPixels] = useState<Set<string>>(new Set());
  const [brushSize, setBrushSize] = useState(20);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"manual" | "ai-track">("manual");
  const [isTracking, setIsTracking] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // 캔버스에 비디오 프레임과 칠한 영역 그리기
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
        if (maskCanvasRef.current) {
          maskCanvasRef.current.width = video.videoWidth;
          maskCanvasRef.current.height = video.videoHeight;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 칠한 영역 그리기
      if (paintedPixels.size > 0) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
        paintedPixels.forEach(pixel => {
          const [x, y] = pixel.split(',').map(Number);
          ctx.fillRect(x - brushSize/2, y - brushSize/2, brushSize, brushSize);
        });
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [paintedPixels, isVideoLoaded, brushSize]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    return { x, y };
  };

  const paintPixel = (x: number, y: number) => {
    setPaintedPixels(prev => {
      const newSet = new Set(prev);
      // 브러시 크기만큼 주변도 칠함
      for (let dx = -Math.floor(brushSize/2); dx <= Math.floor(brushSize/2); dx++) {
        for (let dy = -Math.floor(brushSize/2); dy <= Math.floor(brushSize/2); dy++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && py >= 0) {
            newSet.add(`${px},${py}`);
          }
        }
      }
      return newSet;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsPainting(true);
    const pos = getMousePos(e);
    paintPixel(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting) return;
    e.preventDefault();
    const pos = getMousePos(e);
    paintPixel(pos.x, pos.y);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsPainting(false);
  };

  const handleConfirm = async () => {
    if (paintedPixels.size === 0) {
      alert("워터마크 영역을 칠해주세요.");
      return;
    }

    // 칠한 영역의 경계 박스 계산
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    
    paintedPixels.forEach(pixel => {
      const [x, y] = pixel.split(',').map(Number);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    const boundingBox = {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };

    console.log('Bounding box:', boundingBox);

    // AI 추적 모드인 경우 추적 실행
    if (selectionMode === "ai-track") {
      await trackWatermark(boundingBox);
    } else {
      // 수동 모드는 바로 완료
      onSelectionComplete(boundingBox);
    }
  };

  const trackWatermark = async (referenceBox: { x: number; y: number; w: number; h: number }) => {
    setIsTracking(true);
    setTrackProgress(10);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("referenceBox", JSON.stringify(referenceBox));
      formData.append("samplingFps", "2");

      setTrackProgress(30);

      const response = await fetch("/api/track-watermark", {
        method: "POST",
        body: formData,
      });

      setTrackProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "추적 실패");
      }

      const data = await response.json();
      setTrackProgress(100);

      // 추적 데이터를 사용하여 처리
      // 여기서는 간단히 첫 번째 위치를 사용하거나, 모든 위치의 평균/최대 범위를 계산
      alert(`✅ AI 추적 완료! ${data.trackingData.length}개 프레임에서 워터마크를 발견했습니다.`);
      
      // 실제 구현: 모든 추적 데이터를 다음 단계로 전달
      // 지금은 참조 박스를 그대로 전달
      onSelectionComplete(referenceBox);
    } catch (error) {
      console.error("Tracking error:", error);
      alert(error instanceof Error ? error.message : "워터마크 추적 중 오류가 발생했습니다.");
    } finally {
      setIsTracking(false);
    }
  };

  const handleReset = () => {
    setPaintedPixels(new Set());
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

      {/* 모드 선택 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
          🎯 선택 모드
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectionMode("manual")}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              selectionMode === "manual"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="text-lg mb-1">📍</div>
            <div className="text-sm">수동 선택</div>
            <div className="text-xs opacity-75 mt-1">고정 위치</div>
          </button>
          <button
            onClick={() => setSelectionMode("ai-track")}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              selectionMode === "ai-track"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="text-lg mb-1">🤖</div>
            <div className="text-sm">AI 추적</div>
            <div className="text-xs opacity-75 mt-1">이동 워터마크</div>
          </button>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
          {selectionMode === "manual" 
            ? "💡 워터마크가 고정된 위치에 있을 때 사용" 
            : "💡 워터마크가 영상 내에서 이동할 때 AI가 자동 추적"}
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          💡 <strong>사용 방법:</strong> 비디오에서 워터마크가 있는 영역을 마우스로 칠하세요.
        </p>
        
        {/* 브러시 크기 조절 */}
        <div>
          <label className="block text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
            브러시 크기: {brushSize}px
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full"
          />
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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>비디오 로딩 중...</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
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
          className="w-full select-none relative z-20"
          style={{ 
            display: isVideoLoaded ? 'block' : 'none',
            touchAction: 'none',
            cursor: isPainting ? 'none' : 'crosshair'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {/* 브러시 커서 */}
        {isPainting && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              width: `${brushSize}px`,
              height: `${brushSize}px`,
              borderRadius: '50%',
              border: '2px solid red',
              backgroundColor: 'rgba(239, 68, 68, 0.3)',
              transform: 'translate(-50%, -50%)',
              display: 'none'
            }}
          />
        )}
        <canvas
          ref={maskCanvasRef}
          className="hidden"
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
          disabled={paintedPixels.size === 0}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
        >
          🔄 지우기
        </button>
      </div>

      {/* 선택 정보 */}
      {paintedPixels.size > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-medium text-green-900 dark:text-green-200 mb-2">
            ✅ 워터마크 영역 칠함
          </h3>
          <p className="text-sm text-green-800 dark:text-green-300">
            칠한 픽셀 수: {paintedPixels.size.toLocaleString()}개
          </p>
        </div>
      )}

      {/* AI 추적 진행률 */}
      {isTracking && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>🤖 AI가 워터마크를 추적하는 중...</span>
            <span>{trackProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${trackProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={paintedPixels.size === 0 || isTracking}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
      >
        {isTracking
          ? "🤖 AI 추적 중..."
          : paintedPixels.size > 0
          ? selectionMode === "ai-track"
            ? "🤖 AI 추적 시작 - 다음 단계"
            : "✅ 선택 완료 - 다음 단계"
          : "🖌️ 워터마크 영역을 칠하세요"}
      </button>
    </div>
  );
}

