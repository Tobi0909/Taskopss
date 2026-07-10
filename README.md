# Task Ops — Quản lý công việc đội hạ tầng

Công cụ quản lý công việc nội bộ dành cho đội System/Infrastructure Engineer: Kanban board, danh sách dạng bảng, bình luận có @mention, file đính kèm, thông báo realtime, dashboard thống kê. Self-hosted hoàn toàn trên hạ tầng của bạn, không phụ thuộc dịch vụ cloud bên thứ ba.

<img width="1601" height="793" alt="image" src="https://github.com/user-attachments/assets/eff5c721-ee7b-45ac-ab2e-71161a963bd5" />


## Kiến trúc

```
frontend/   React + TypeScript + Vite + Tailwind + shadcn/ui
backend/    NestJS + TypeScript + Prisma + Socket.IO
            PostgreSQL (dữ liệu), filesystem local (file đính kèm)
```

Backend expose REST API (`/api/*`) và WebSocket (`/socket.io`) trên cùng port 4000. Frontend build tĩnh, phục vụ qua nginx, nginx proxy `/api` và `/socket.io` sang backend — trình duyệt chỉ nói chuyện với một origin duy nhất.

## Yêu cầu hệ thống

- Ubuntu Server 22.04+ (hoặc bất kỳ Linux nào chạy được Docker)
- [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) 24+
- [Docker Compose plugin](https://docs.docker.com/compose/install/linux/) (đi kèm Docker Desktop/Engine bản mới, kiểm tra bằng `docker compose version`)
- Tối thiểu 1 vCPU / 2GB RAM cho quy mô một team nhỏ (~10-30 người)

## Cài đặt lần đầu

```bash
git clone <repo-url> taskops
cd taskops
cp .env.example .env
```

Mở `.env`, chỉnh các giá trị sau (bắt buộc trước khi chạy production):

| Biến | Ý nghĩa | Cách tạo |
|---|---|---|
| `POSTGRES_PASSWORD` | Mật khẩu Postgres | Chuỗi ngẫu nhiên đủ mạnh |
| `JWT_ACCESS_SECRET` | Ký access token (15 phút) | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Ký refresh token (7 ngày) | `openssl rand -hex 32` — **phải khác** `JWT_ACCESS_SECRET` |
| `FRONTEND_PORT` | Port truy cập web (mặc định 8080) | Đổi nếu trùng cổng khác trên server |

Các biến còn lại (`MAX_UPLOAD_SIZE_MB`, `BACKEND_PORT`...) có giá trị mặc định hợp lý, chỉnh nếu cần.

```bash
docker compose up -d --build
```

Lần chạy đầu, backend tự động áp dụng migration Prisma (`prisma migrate deploy`) trước khi khởi động. Kiểm tra:

```bash
docker compose ps
docker compose logs -f backend
```

### Tạo tài khoản quản trị đầu tiên

Chưa có giao diện đăng ký công khai (đây là công cụ nội bộ — tài khoản do admin tạo, không mở đăng ký tự do). Sau khi container `backend` đã chạy, seed tài khoản admin đầu tiên:

```bash
docker compose exec backend npx prisma db seed
```

Mặc định tạo tài khoản `admin@company.local` / mật khẩu `ChangeMe123!` — **đăng nhập và đổi mật khẩu ngay**. Để đặt sẵn thông tin thật thay vì giá trị mặc định, set trước khi seed:

```bash
docker compose exec -e SEED_ADMIN_EMAIL=ops@yourcompany.com \
  -e SEED_ADMIN_PASSWORD='mat-khau-manh-that-su' \
  -e SEED_ADMIN_NAME='Tên quản trị viên' \
  backend npx prisma db seed
```

Lệnh seed **an toàn để chạy nhiều lần** (idempotent) — không tạo trùng board/tag/admin. Ở môi trường development (`NODE_ENV=development`), seed sẽ tạo thêm 3 tài khoản mẫu + 8 task demo để xem giao diện có dữ liệu ngay; ở production (`NODE_ENV=production`, mặc định trong `docker-compose.yml`), seed **chỉ tạo tài khoản admin và board rỗng** — không có dữ liệu giả.

Sau khi có tài khoản admin, dùng trang **Thành viên** trong ứng dụng để thêm các thành viên còn lại trong team.

Truy cập: `http://<địa-chỉ-server>:8080` (hoặc port bạn đặt ở `FRONTEND_PORT`).

## Vận hành hàng ngày

```bash
docker compose logs -f backend      # xem log backend
docker compose logs -f frontend     # xem log nginx/frontend
docker compose restart backend      # restart riêng backend (VD sau khi đổi .env)
docker compose down                 # dừng toàn bộ, giữ nguyên dữ liệu (volume)
docker compose up -d --build        # cập nhật code mới rồi khởi động lại
```

Lưu ý: `docker compose down -v` sẽ **xoá luôn volume** (mất dữ liệu Postgres và file đính kèm) — chỉ dùng khi thực sự muốn làm sạch từ đầu.

## Backup

### Database (Postgres)

Backup thủ công:

```bash
docker compose exec db pg_dump -U taskman taskman > backup-$(date +%Y%m%d).sql
```

Restore vào một instance mới/sạch:

```bash
cat backup-20260709.sql | docker compose exec -T db psql -U taskman taskman
```

Khuyến nghị đặt cron backup hàng ngày trên server, ví dụ thêm vào crontab:

```
0 2 * * * cd /path/to/taskops && docker compose exec -T db pg_dump -U taskman taskman | gzip > /path/to/backups/taskops-$(date +\%Y\%m\%d).sql.gz
```

Nhớ dọn các bản backup cũ định kỳ (`find /path/to/backups -mtime +30 -delete` chẳng hạn).

### File đính kèm

File lưu trong Docker named volume `uploads` (mount vào `/data/uploads` trong container backend). Backup bằng cách archive volume:

```bash
docker run --rm -v taskops_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

(Đổi `taskops_uploads` thành tên volume thật — kiểm tra bằng `docker volume ls | grep uploads`.)

## Biến môi trường đầy đủ

Xem `.env.example` ở thư mục gốc (dùng cho `docker-compose.yml`) và `backend/.env.example` (dùng khi chạy backend không qua Docker, VD lúc phát triển local).

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `POSTGRES_USER` | `taskman` | |
| `POSTGRES_PASSWORD` | — | **Bắt buộc đổi** |
| `POSTGRES_DB` | `taskman` | |
| `JWT_ACCESS_SECRET` | — | **Bắt buộc đổi**, tối thiểu 16 ký tự |
| `JWT_REFRESH_SECRET` | — | **Bắt buộc đổi**, khác với access secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `MAX_UPLOAD_SIZE_MB` | `25` | Giới hạn mỗi file đính kèm |
| `BACKEND_PORT` | `4000` | Port backend expose ra host (debug trực tiếp API nếu cần) |
| `FRONTEND_PORT` | `8080` | Port truy cập web chính |

## Reverse proxy / HTTPS (tuỳ chọn)

`docker-compose.yml` không tự cấu hình TLS. Nếu deploy ra ngoài internet (không chỉ mạng nội bộ), đặt một reverse proxy phía trước container `frontend` (Caddy là lựa chọn đơn giản nhất — tự động xin chứng chỉ Let's Encrypt):

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

Nếu chỉ dùng trong mạng nội bộ công ty (VPN/LAN), có thể bỏ qua bước này.

## Khắc phục sự cố

- **Backend không kết nối được Postgres lúc khởi động**: kiểm tra `docker compose logs db` — thường do `POSTGRES_PASSWORD` trong `.env` không khớp với volume Postgres đã tạo trước đó (đổi mật khẩu sau khi đã chạy lần đầu không tự áp dụng — cần xoá volume hoặc đổi mật khẩu qua `psql`).
- **Không tải được file đính kèm / lỗi ghi file**: kiểm tra quyền ghi của volume `uploads`, và `MAX_UPLOAD_SIZE_MB` có đủ lớn cho file đang upload không.
- **WebSocket không kết nối (không thấy cập nhật realtime)**: nếu có reverse proxy phía trước, đảm bảo proxy forward header `Upgrade`/`Connection` cho `/socket.io` (Caddy làm tự động; nginx/Apache cần cấu hình thủ công tương tự file `frontend/nginx.conf` trong repo).
- **Quên mật khẩu admin**: một admin khác có thể vào trang Thành viên để không đổi được mật khẩu người khác trực tiếp hiện tại — cần truy cập trực tiếp Postgres để cấp lại, hoặc seed một admin mới với email khác.

## Phát triển local (không qua Docker)

Xem `backend/README` (nếu có) hoặc chạy nhanh:

```bash
# Backend — cần Postgres chạy sẵn (VD qua docker compose up db)
cd backend
cp .env.example .env   # sửa DATABASE_URL trỏ vào Postgres đang chạy
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend (terminal khác)
cd frontend
npm install
npm run dev
```

Frontend chạy ở `http://localhost:5173`, tự proxy API/WebSocket sang backend ở `http://localhost:4000`.
