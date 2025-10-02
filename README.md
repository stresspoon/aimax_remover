# 🎬 AI Max Remover - 워터마크 자동 제거 웹앱

Gemini 2.5 Flash 모델을 활용한 AI 기반 이동 워터마크 자동 감지 및 제거 웹 애플리케이션

## ✨ 주요 기능

- **영상 업로드**: 드래그 앤 드롭으로 간편한 영상 업로드
- **AI 워터마크 감지**: Gemini 2.5 Flash로 자동 워터마크 탐지
- **편집 기능**: 타임라인 히트맵과 실시간 프리뷰
- **워터마크 제거**: FFmpeg.wasm 기반 클라이언트 처리
- **결과 다운로드**: 처리된 영상 즉시 다운로드

## 🚀 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
```

`.env.local` 파일에 Gemini API 키를 입력하세요:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**보안**: `NEXT_PUBLIC_` 접두사를 사용하지 않아 API 키가 서버에서만 사용되고 클라이언트에 노출되지 않습니다.

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 앱을 확인하세요.

## 📋 기술 스택

- **프레임워크**: Next.js 14 + TypeScript
- **스타일링**: Tailwind CSS
- **영상 처리**: FFmpeg.wasm
- **AI 모델**: Google Gemini 2.5 Flash
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

### 2. Gemini API 연동

```typescript
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
const prompt = `
  Analyze the entire video. Return JSON array of detections 
  with MM:SS timestamps and normalized boxes.
  Sample at 2 FPS, up to 4 FPS for fast-moving marks.
`;
```

### 3. FFmpeg 워터마크 제거

```typescript
await ffmpeg.exec([
  "-i", "input.mp4",
  "-vf", `delogo=x=${x}:y=${y}:w=${w}:h=${h}`,
  "-c:v", "libx264",
  "-preset", "fast",
  "output.mp4",
]);
```

## 📁 프로젝트 구조

```
aimax_remover/
├── app/
│   ├── api/
│   │   └── detect-watermark/
│   │       └── route.ts      # 워터마크 감지 API (서버)
│   ├── page.tsx              # 메인 페이지 (단계 관리)
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 전역 스타일
├── components/
│   ├── VideoUploader.tsx     # 영상 업로드
│   ├── WatermarkDetector.tsx # AI 감지 (클라이언트)
│   ├── WatermarkEditor.tsx   # 편집 UI
│   └── VideoProcessor.tsx    # 워터마크 제거
├── utils/
│   └── coordinates.ts        # 좌표 변환 유틸
└── next.config.js            # COOP/COEP 헤더 설정
```

## 🧪 테스트 케이스

- [ ] 다양한 길이의 영상 (수초~수분)
- [ ] 샘플링 FPS 변경 (1-4 FPS)
- [ ] 여러 워터마크 동시 감지
- [ ] 이동하는 워터마크 추적
- [ ] FFmpeg 필터 품질 검증

## 🔒 보안 설정

크로스 오리진 격리를 위한 헤더 설정:

```javascript
{
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp"
}
```

## 📝 API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 방문
2. API 키 생성
3. `.env.local` 파일에 추가

## 🌐 Vercel 배포

### 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

- **Key**: `GEMINI_API_KEY` (⚠️ `NEXT_PUBLIC_` 접두사 없이!)
- **Value**: 발급받은 Gemini API 키

**중요**: `NEXT_PUBLIC_` 접두사를 사용하지 않음으로써 API 키가 서버에서만 사용되고 브라우저에 노출되지 않습니다.

### 배포 방법

1. Vercel에서 GitHub 저장소 연결
2. Environment Variables에 `GEMINI_API_KEY` 추가
3. Deploy 버튼 클릭

## 🚧 향후 개발

- [ ] 서버 사이드 Python 인페인팅 백엔드
- [ ] 다중 워터마크 동시 제거
- [ ] 실시간 처리 진행률 표시
- [ ] 배치 처리 기능
- [ ] 히스토리 관리

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 PR을 환영합니다!

