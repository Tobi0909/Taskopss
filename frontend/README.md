# Task Ops — Frontend

React + TypeScript + Vite + Tailwind + shadcn/ui.

Xem hướng dẫn cài đặt, biến môi trường và triển khai đầy đủ ở [README.md gốc của dự án](../README.md).

## Chạy local (không qua Docker)

```bash
npm install
npm run dev
```

Cần backend chạy ở `http://localhost:4000` (xem `../backend/README` hoặc README gốc). Vite tự proxy `/api` và `/socket.io` sang backend, cấu hình trong `vite.config.ts`.
