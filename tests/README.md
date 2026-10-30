# tests/

- `js/`: test lõi JS, chạy `node --test tests/js/` (Node ≥ 20, không cần npm).
- `golden/`: ca kiểm **chung** cho JS và Python. Mỗi file:
  ```json
  { "suite": "money_words", "cases": [ { "name": "…", "input": …, "expected": … } ] }
  ```
  Bên JS đọc ở `tests/js/golden.test.js`; bên Python đọc ở `backend/tests/test_golden.py`.
  **Không sửa golden để test xanh.** Chỉ sửa khi spec đổi (docs hoặc ADR), và ghi HANDOFF.
- Test backend nằm ở `backend/tests/`.
