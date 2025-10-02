# 🎬 AI Max Remover - 워터마크 자동 제거 웹앱

Gemini 2.5 Flash 모델을 활용한 AI 기반 이동 워터마크 자동 감지 및 제거 웹 애플리케이션

## ✨ 주요 기능

- **영상 업로드**: 드래그 앤 드롭으로 간편한 영상 업로드
- **수동 영역 선택**: 사용자가 직접 워터마크 영역을 박스로 지정
- **실시간 프리뷰**: 비디오 재생하며 워터마크 위치 확인
- **워터마크 제거**: FFmpeg.wasm 기반 클라이언트 처리 (2가지 방법)
- **결과 다운로드**: 처리된 영상 즉시 다운로드

## 🚀 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
```

환경 변수 설정이 필요하지 않습니다. 바로 실행할 수 있습니다!

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 앱을 확인하세요.

## 📋 기술 스택

- **프레임워크**: Next.js 14 + TypeScript
- **스타일링**: Tailwind CSS
- **영상 처리**: FFmpeg.wasm (delogo / boxblur)
- **UI/UX**: Canvas 기반 드래그 선택
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

### 2. 사용자 영역 선택

Canvas에서 마우스 드래그로 워터마크 영역 선택:

```typescript
const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const pos = getMousePos(e);
  setIsDrawing(true);
  setStartPos(pos);
};
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
│   ├── page.tsx              # 메인 페이지 (단계 관리)
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 전역 스타일
├── components/
│   ├── VideoUploader.tsx     # 영상 업로드
│   ├── WatermarkSelector.tsx # 수동 영역 선택 (Canvas)
│   └── VideoProcessor.tsx    # 워터마크 제거 (FFmpeg)
├── utils/
│   └── coordinates.ts        # 좌표 변환 유틸
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

환경 변수 설정 없이 바로 배포 가능합니다:

1. [Vercel](https://vercel.com)에 로그인
2. GitHub 저장소 `stresspoon/aimax_remover` 연결
3. **Deploy** 버튼 클릭

모든 처리가 클라이언트에서 이루어지므로 추가 설정이 필요 없습니다.

## 🎯 사용 흐름

```
1. 영상 업로드 → 2. 워터마크 영역 선택 → 3. 제거 방법 선택 → 4. 다운로드
   (드래그 앤 드롭)    (마우스 드래그)         (Delogo/BoxBlur)      (즉시 다운로드)
```

## 🚧 향후 개발

- [ ] AI 자동 감지 옵션 추가 (선택적)
- [ ] 서버 사이드 Python 인페인팅 백엔드 (고품질)
- [ ] 다중 영역 선택 (여러 워터마크 동시 제거)
- [ ] 배치 처리 기능
- [ ] 처리 히스토리 관리

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 PR을 환영합니다!

