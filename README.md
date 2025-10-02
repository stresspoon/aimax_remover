# 🎬 AI Max Remover - 워터마크 자동 제거 웹앱

Gemini 2.0 Flash API를 활용한 AI 기반 이동 워터마크 자동 추적 및 제거 웹 애플리케이션

## ✨ 주요 기능

### 🎨 직관적인 인터페이스
- **영상 업로드**: 드래그 앤 드롭으로 간편한 영상 업로드
- **브러시 페인팅**: 마우스로 워터마크 영역을 칠하여 선택
- **브러시 크기 조절**: 5px ~ 50px 자유롭게 조정
- **실시간 프리뷰**: 편집/프리뷰 모드로 제거 결과 미리 확인

### 🤖 AI 추적 기능 (NEW!)
- **수동 모드**: 고정 위치 워터마크 빠른 제거
- **AI 추적 모드**: 이동하는 워터마크를 프레임별로 자동 추적
  - 한 번 칠하면 전체 영상에서 자동으로 워터마크 위치 추적
  - 타임스탬프별 다른 위치의 워터마크 동시 제거
  - Gemini 2.0 Flash API 기반 정확한 추적

### 🎬 고급 처리 옵션
- **Delogo 필터**: 주변 픽셀 분석으로 자연스러운 복원
- **BoxBlur 필터**: 선택 영역만 강력한 블러 (배경 선명 유지)
- **처리 결과 미리보기**: 다운로드 전 비디오 플레이어로 확인
- **즉시 다운로드**: 만족스러우면 바로 다운로드

## 🚀 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
```

`.env.local` 파일 생성 (AI 추적 기능 사용 시만 필요):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**참고**: 
- 수동 선택 모드만 사용하면 API 키 불필요
- AI 추적 기능 사용 시에만 Gemini API 키 필요

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 앱을 확인하세요.

## 📋 기술 스택

- **프레임워크**: Next.js 14 + TypeScript
- **스타일링**: Tailwind CSS
- **AI 모델**: Google Gemini 2.0 Flash API
- **영상 처리**: FFmpeg.wasm (delogo / boxblur 필터)
- **UI/UX**: Canvas 기반 브러시 페인팅
- **보안**: COOP/COEP 헤더 설정

## 🔧 핵심 구현 사항

### 1. 좌표 변환

Gemini API는 0-1000 정규화 좌표를 반환합니다:

```typescript
function denormalize(box, width, height) {
  const [y1, x1, y2, x2] = box;
  return {
    x1: Math.round((x1/1000) * width),
    y1: Math.round((y1/1000) * height),
    x2: Math.round((x2/1000) * width),
    y2: Math.round((y2/1000) * height),
  };
}
```

### 2. 브러시 페인팅 선택

Canvas에서 마우스로 워터마크 영역을 칠함:

```typescript
const paintPixel = (x: number, y: number) => {
  setPaintedPixels(prev => {
    const newSet = new Set(prev);
    for (let dx = -brushSize/2; dx <= brushSize/2; dx++) {
      for (let dy = -brushSize/2; dy <= brushSize/2; dy++) {
        newSet.add(`${x + dx},${y + dy}`);
      }
    }
    return newSet;
  });
};
```

### 3. AI 워터마크 추적

Gemini API로 프레임별 워터마크 위치 추적:

```typescript
// API 호출
const response = await fetch("/api/track-watermark", {
  method: "POST",
  body: formData, // video + referenceBox
});

// 타임스탬프별 다른 위치 필터 적용
trackingData.forEach((track) => {
  const { x, y, w, h } = track.box;
  const timeInSeconds = parseTimestamp(track.ts);
  filters.push(
    `delogo=x=${x}:y=${y}:w=${w}:h=${h}:band=2:enable='between(t,${timeInSeconds},${timeInSeconds + 0.5})'`
  );
});
```

### 4. FFmpeg 워터마크 제거

```typescript
// 수동 모드: 고정 위치
await ffmpeg.exec([
  "-i", "input.mp4",
  "-vf", `delogo=x=${x}:y=${y}:w=${w}:h=${h}:band=2`,
  "-c:v", "libx264", "-preset", "fast",
  "output.mp4",
]);

// AI 추적 모드: 타임스탬프별 필터 체인
await ffmpeg.exec([
  "-i", "input.mp4",
  "-vf", filterChain, // 여러 delogo 필터 연결
  "-c:v", "libx264", "-preset", "fast",
  "output.mp4",
]);
```

## 📁 프로젝트 구조

```
aimax_remover/
├── app/
│   ├── page.tsx              # 메인 페이지 (단계 관리)
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 전역 스타일
├── components/
│   ├── VideoUploader.tsx     # 영상 업로드
│   ├── WatermarkSelector.tsx # 브러시 페인팅 선택 + AI 추적
│   └── VideoProcessor.tsx    # 워터마크 제거 (FFmpeg)
├── app/api/
│   └── track-watermark/      # Gemini API 서버 엔드포인트
│       └── route.ts
└── next.config.js            # COOP/COEP 헤더 설정
```

## 🧪 테스트 케이스

- [ ] 다양한 길이의 영상 (수초~수분)
- [ ] 다양한 해상도 (720p, 1080p, 4K)
- [ ] 여러 위치의 워터마크 (모서리, 중앙)
- [ ] Delogo vs BoxBlur 품질 비교
- [ ] FFmpeg 필터 품질 검증

## 🔒 보안 설정

크로스 오리진 격리를 위한 헤더 설정:

```javascript
{
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp"
}
```

## 🌐 Vercel 배포

### 기본 배포 (수동 선택만)
환경 변수 없이 바로 배포 가능

### AI 추적 기능 포함 배포
Environment Variables 설정:
- **Key**: `GEMINI_API_KEY`
- **Value**: 발급받은 Gemini API 키

배포 방법:
1. [Vercel](https://vercel.com)에 로그인
2. GitHub 저장소 연결
3. (선택) Environment Variables 추가
4. **Deploy** 클릭

## 🎯 사용 흐름

### 📍 수동 모드 (고정 워터마크)
```
1. 영상 업로드 
   ↓
2. 수동 선택 모드
   ↓
3. 브러시로 워터마크 칠하기
   ↓
4. 👁️ 프리뷰 버튼으로 확인
   ↓
5. 선택 완료
   ↓
6. 제거 방법 선택 (Delogo/BoxBlur)
   ↓
7. 처리 후 미리보기
   ↓
8. 다운로드
```

### 🤖 AI 추적 모드 (이동 워터마크)
```
1. 영상 업로드
   ↓
2. AI 추적 모드 선택
   ↓
3. 첫 프레임에서 워터마크 칠하기
   ↓
4. AI 추적 시작 (자동으로 전체 영상 분석)
   ↓
5. 타임스탬프별 위치 데이터 생성
   ↓
6. 제거 방법 선택 (Delogo 권장)
   ↓
7. 프레임별 다른 위치 자동 제거
   ↓
8. 처리 후 미리보기
   ↓
9. 다운로드
```

## ✅ 구현 완료

- ✅ AI 추적 기능 (Gemini 2.0 Flash)
- ✅ 브러시 페인팅 인터페이스
- ✅ 프리뷰 모드 (편집/검정색)
- ✅ 처리 결과 미리보기
- ✅ 타임스탬프별 필터 적용
- ✅ 선택 영역만 블러 처리

## 🚧 향후 개발

- [ ] 서버 사이드 Python 인페인팅 백엔드 (고품질)
- [ ] 다중 영역 선택 (여러 워터마크 동시 제거)
- [ ] 배치 처리 기능
- [ ] 처리 히스토리 관리
- [ ] GPU 가속 처리

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 PR을 환영합니다!

