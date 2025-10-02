/**
 * Gemini API의 정규화된 좌표(0-1000)를 실제 픽셀 좌표로 변환
 */
export function denormalize(
  box: [number, number, number, number],
  width: number,
  height: number
) {
  const [y1, x1, y2, x2] = box;
  return {
    x1: Math.round((x1 / 1000) * width),
    y1: Math.round((y1 / 1000) * height),
    x2: Math.round((x2 / 1000) * width),
    y2: Math.round((y2 / 1000) * height),
  };
}

/**
 * 실제 픽셀 좌표를 정규화된 좌표(0-1000)로 변환
 */
export function normalize(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number
): [number, number, number, number] {
  return [
    Math.round((y1 / height) * 1000),
    Math.round((x1 / width) * 1000),
    Math.round((y2 / height) * 1000),
    Math.round((x2 / width) * 1000),
  ];
}

/**
 * MM:SS 형식의 타임스탬프를 초 단위로 변환
 */
export function timestampToSeconds(timestamp: string): number {
  const [mins, secs] = timestamp.split(":").map(Number);
  return mins * 60 + secs;
}

/**
 * 초 단위를 MM:SS 형식의 타임스탬프로 변환
 */
export function secondsToTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

