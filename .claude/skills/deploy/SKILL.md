---
name: deploy
description: Merge nhánh feature vào main, push main lên GitHub, deploy production (Firebase Hosting + Firestore rules, project kids-learning-vh), rồi xoá nhánh feature và worktree của nó. Chỉ dùng khi người dùng nói "deploy" (hoặc gõ /deploy), không tự chạy theo suy đoán.
argument-hint: "[tên nhánh feature]"
---

# Deploy Bé Học Vui

Người dùng nói "deploy" là đã cho phép **đúng một lần** merge vào main, push `main` và deploy production
trong lượt này, rồi xoá nhánh feature và worktree đã merge. Lời cho phép không kéo dài sang lần sau. Không bao
giờ force push.

Đi lần lượt từng bước. Bước nào lỗi thì dừng, báo lỗi kèm output, không làm bước sau.

## 0. Xác định nhánh và chỗ chạy lệnh

- Nhánh feature: lấy từ argument nếu có. Không có thì lấy nhánh của worktree session đang làm việc
  (`git branch --show-current`). Đang ở `main` mà main không hơn `origin/main` commit nào thì không có gì để
  merge: hỏi người dùng nhánh nào. Có nhiều nhánh có thể là ứng viên mà không rõ cái nào: hỏi.
- Checkout main: là dòng đầu của `git worktree list` (hiện là `/Users/work/Workspace/VH/kids-learning`).
- Session đang bị cô lập trong worktree (harness từ chối git lệnh trỏ ra ngoài worktree) thì commit hết việc
  dở, gọi `ExitWorktree` với `action: "keep"` rồi chạy các bước dưới từ checkout main. Không xoá worktree.

## 1. Kiểm nhánh feature (chạy trong thư mục của nhánh đó)

1. `git status --porcelain --untracked-files=no` phải rỗng. Còn thay đổi chưa commit thì hỏi người dùng có
   commit không, không tự bỏ.
2. `npm test`, `npm run typecheck`, `npm run lint` đều phải qua.
3. Audio: `npm run tts:build` (chỉ gọi API cho câu chưa có mp3, cần `.env.local`; worktree mới thì copy
   `.env.local` từ checkout main). Nếu lệnh sinh hoặc xoá file trong `public/audio/`, commit trên nhánh feature
   với message `Update lesson audio`. Câu thiếu mp3 lên production sẽ đọc bằng giọng trình duyệt, nên không bỏ
   qua bước này.

## 2. Merge vào main (trong checkout main)

1. Checkout main phải đang ở nhánh `main` và `git status --porcelain --untracked-files=no` rỗng. Không rỗng thì
   dừng và hỏi, không stash, không reset.
2. `git fetch origin` rồi `git merge --ff-only origin/main` để main local bắt kịp remote.
3. `git merge --ff-only <nhánh>`. Không fast-forward được thì `git merge --no-edit <nhánh>` (tạo merge commit).
   Có conflict thì `git merge --abort`, dừng, báo các file conflict và hỏi người dùng.

## 3. Kiểm lại trên main sau merge

`npm test` và `npm run build` trong checkout main. Lỗi thì dừng **trước khi push**, báo người dùng (main local
đã có merge nhưng chưa lên remote, chưa deploy).

## 4. Push

`git push origin main` — push thường, không `--force`, không `--force-with-lease`.

Bị từ chối non-fast-forward thì dừng và hỏi: nói main local và `origin/main` phân kỳ ra sao (`git log --oneline
main...origin/main`), nêu lựa chọn (fetch + merge lại rồi push). Không tự retry bằng force.

## 5. Deploy production

Từ checkout main, sau khi `npm run build` ở bước 3 đã tạo `dist/` từ đúng commit vừa push:

```sh
firebase deploy --only firestore:rules,hosting --project kids-learning-vh
```

Lỗi đăng nhập thì nhờ người dùng chạy `! firebase login --reauth`, rồi chạy lại bước này.

## 6. Kiểm production

- `curl -sI https://kids-learning-vh.web.app/` trả 200.
- `curl -s https://kids-learning-vh.web.app/ | grep -o 'assets/index-[^"]*\.js'` khớp tên file trong
  `dist/index.html`, tức là bản mới đã lên.

## 7. Xoá nhánh feature và worktree

Chỉ làm khi bước 6 đã qua (bản mới đang chạy trên production). Chạy từ checkout main. Nhánh feature là `main`
thì bỏ qua bước này.

1. Nhánh phải đã nằm trọn trong main: `git branch --merged main` có tên nhánh. Không có thì dừng và hỏi.
2. Tìm worktree của nhánh trong `git worktree list` (có thể không có). Nếu có:
   - `git -C <worktree> status --porcelain` phải rỗng (file bị `.gitignore` như `.env.local`, `node_modules`
     không hiện ở đây và không cần giữ). Còn file sửa hoặc file mới chưa track thì dừng, liệt kê và hỏi, vì xoá
     worktree sẽ mất chúng.
   - Session vẫn đang ở trong worktree đó thì `ExitWorktree` với `action: "keep"` trước.
   - `git worktree unlock <worktree>` (báo "is not locked" thì bỏ qua), rồi `git worktree remove <worktree>`.
     Không dùng `--force`: git từ chối nghĩa là còn thứ chưa lưu, dừng và hỏi.
3. `git branch -d <nhánh>` — xoá an toàn, không dùng `-D`.
4. Nhánh có trên remote (`git ls-remote --heads origin <nhánh>` có kết quả) thì `git push origin --delete <nhánh>`.
5. `git worktree prune`.

## 8. Báo cáo

- Nhánh đã merge, commit cuối của main (short hash), merge kiểu fast-forward hay merge commit.
- Đã push `main` (khoảng commit `old..new`).
- URL production và kết quả bước 6.
- Đã xoá worktree nào, nhánh local / remote nào; bước 7 dừng ở đâu thì nói rõ lý do.
