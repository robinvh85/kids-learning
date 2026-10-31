# Bé Học Vui

Web học cho bé chuẩn bị vào lớp 1: chữ cái, đánh vần, số và phép tính trong phạm vi 10.
Thứ tự bài theo bộ sách **Kết nối tri thức** (Tiếng Việt 1, Toán 1).

## Chạy

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # kiểm tra nội dung bài học và logic ôn tập
npm run build      # bản production ở dist/
```

## Giọng đọc (Google Cloud Text-to-Speech)

1. Copy `.env.example` thành `.env.local`, điền `GOOGLE_TTS_API_KEY`.
2. `npm run tts:samples` sinh câu mẫu cho mọi giọng vi-VN. Nghe thử ở `#/voices` (khu Ba mẹ → Nghe thử).
3. Đặt `TTS_VOICE=<giọng đã chọn>` trong `.env.local`, rồi chạy `npm run tts:build`. Lệnh này sinh mp3 cho mọi câu
   trong bài học vào `public/audio/` và commit cùng code.

Câu nào chưa có mp3 thì app dùng tạm giọng tiếng Việt của trình duyệt. Chỉ dùng cách này lúc phát triển.

## Đồng bộ tiến độ (Firebase)

- Chưa đăng nhập: tiến độ lưu trên máy (`localStorage`).
- Ba mẹ đăng nhập Google ở khu Ba mẹ: tiến độ trên máy được đẩy lên Firestore (project `kids-learning-vh`), sau đó
  đọc ghi qua Firestore có cache offline. Dữ liệu nằm ở `parents/{uid}/...`, luật bảo mật ở `firestore.rules`.
- Deploy: `firebase deploy --only firestore:rules,hosting` (sau `npm run build`).

Chạy thử với emulator: chạy Firebase Auth + Firestore emulator ở cổng 9099 / 8080 (cần Java 21), rồi
`VITE_FIREBASE_EMULATORS=1 npm run dev`.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/content/` | Bài học (`tieng-viet.ts`, `toan.ts`), schema zod, mọi câu nói (`speech.ts`) |
| `src/activities/` | Mỗi dạng bài một component: nghe chọn, ghép âm, tô chữ, đếm, so sánh, tách số |
| `src/engine/` | Âm thanh, lưu tiến độ (`ProgressRepository`), ôn tập ngắt quãng, router |
| `src/screens/` | Trang chủ, bản đồ bài, màn học, khu Ba mẹ |
| `scripts/` | Sinh audio bằng Google TTS |

Thêm bài mới: thêm object vào `src/content/tieng-viet.ts` hoặc `toan.ts` bằng các hàm trong `helpers.ts`, chạy
`npm test`, rồi `npm run tts:build`.
