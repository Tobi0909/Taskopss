# taskops-cli

CLI để đăng nhập và thao tác task TaskOps từ máy local, gọi thẳng vào REST API đã có sẵn (`/api/*`) — không cần mở trình duyệt. Dùng cùng tài khoản (email/mật khẩu) như trên web.

## Cài đặt

```bash
cd cli
npm install
npm run build
npm link        # tạo lệnh toàn cục `taskops`
```

Bỏ `npm link` nếu chỉ muốn chạy cục bộ: `node dist/index.js <lệnh>`.

## Đăng nhập

```bash
taskops login --url http://<địa-chỉ-backend>:4000
```

`--url` chỉ cần truyền lần đầu (hoặc khi đổi server) — CLI lưu lại trong `~/.config/taskops-cli/config.json` (quyền `600`, chỉ user hiện tại đọc được), gồm access token + refresh token. Access token tự làm mới khi hết hạn (15 phút mặc định); refresh token hết hạn sau 7 ngày thì cần `taskops login` lại.

Nếu deploy qua Docker theo `docker-compose.yml` mặc định, backend expose ở `BACKEND_PORT` (mặc định 4000): `taskops login --url http://<server>:4000`.

## Lệnh

```
taskops whoami                       Xem tài khoản đang đăng nhập
taskops logout                       Đăng xuất, xoá phiên cục bộ

taskops boards list                  Liệt kê board
taskops boards show <board>          Xem board + danh sách cột

taskops tags list                    Liệt kê tag
taskops users list                   Liệt kê thành viên

taskops tasks list [filters]         Liệt kê task
taskops tasks get <id>               Xem chi tiết task
taskops tasks create ...             Tạo task mới (đẩy task từ local lên)
taskops tasks update <id> ...        Cập nhật task
taskops tasks move <id> --column ..  Chuyển task sang cột khác
taskops tasks set-tags <id> --tags.. Gán lại tag cho task
taskops tasks delete <id>            Xoá task
```

`<board>` và `--column` chấp nhận keyPrefix/tên board, tên cột, hoặc UUID trực tiếp — không cần tra UUID thủ công. `--assignee` nhận email. `--tags` nhận danh sách tên tag phân tách bởi dấu phẩy.

### Ví dụ: đẩy một task lên board `OPS`, cột `Backlog`

```bash
taskops tasks create \
  --board OPS \
  --column Backlog \
  --title "Kiểm tra lại cấu hình backup Postgres" \
  --priority P2 \
  --assignee ops@yourcompany.com \
  --due 2026-08-01 \
  --tags infra,backup
```

Thêm `--json` vào các lệnh `list`/`get`/`show` để lấy JSON thô, tiện pipe qua `jq` trong script.
