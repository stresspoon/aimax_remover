"use client";

import { useRef, useState } from "react";

type Props = {
  onVideoLoaded: (file: File, duration: number, width: number, height: number) => void;
};

export default function VideoUploader({ onVideoLoaded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("비디오 파일만 업로드 가능합니다.");
      return;
    }

    setIsLoading(true);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // 비디오 메타데이터 로드
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      setIsLoading(false);
      onVideoLoaded(file, duration, width, height);
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        1. 영상 업로드
      </h2>

      <div
        className={`border-4 border-dashed rounded-xl p-12 text-center transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">비디오 분석 중...</p>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col items-center">
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="max-h-64 rounded-lg mb-4"
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              프리뷰 준비 완료. 다음 단계로 진행됩니다...
            </p>
          </div>
        ) : (
          <div className="cursor-pointer">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
              비디오 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              MP4, MOV, AVI 등 모든 비디오 포맷 지원
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              길이 제한 없음 · 자동 분석
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

