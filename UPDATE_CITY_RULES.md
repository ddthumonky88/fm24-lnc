# Quy tắc cập nhật City cho file LNC

## 1. Xác định file đích

- Chỉ sửa đúng file người dùng yêu cầu: `fm24_club.lnc` hoặc `fm24_club_v2.lnc`.
- Không tự động sao chép thay đổi sang file club còn lại.
- File geography dùng để đối chiếu là `fm24-lnc-be/data/fm24_geography.lnc`.

## 2. Đọc dữ liệu từ ảnh

Với mỗi CLB, lấy đúng ba giá trị:

- `UNIQUE ID` của CLB.
- `CITY` của CLB.
- `NATION` của CLB.

Không dùng kết quả có tên gần giống. Ví dụ:

- `Woking` không phải `Wokingham`.
- `Hampton` không phải `Hampton Loade`.
- `Tarazona` không phải `Tarazona de la Mancha`.

## 3. Tìm City ID

- Tìm `CITY_NAME_CHANGE` theo đúng tên thành phố trong phần đúng quốc gia của `fm24_geography.lnc`.
- Không lấy ID của thành phố trùng tên ở quốc gia khác.
- Nếu tìm thấy đúng thành phố và quốc gia, dùng Unique ID đó.
- Nếu không tìm thấy, dùng chuỗi `rd-uid`.
- Nếu ảnh mới cung cấp City ID cho một dòng đang dùng `rd-uid`, thay `rd-uid` bằng ID mới.

Ví dụ:

```lnc
"CLUB_CITY_CHANGE"		1667		"343"						"" # <Barakaldo>
```

Khi chưa có City ID:

```lnc
"CLUB_CITY_CHANGE"		1723		"rd-uid"						"" # <Pontevedra>
```

## 4. Vị trí bắt buộc trong file club

`CLUB_CITY_CHANGE` phải nằm ngay trên `CLUB_NAME_CHANGE` của cùng UID, không gom các dòng city ở đầu bảng.

```lnc
"CLUB_CITY_CHANGE"		1723		"rd-uid"						"" # <Pontevedra>
"CLUB_NAME_CHANGE"		1723		"Pontevedra CF"					""
```

- Mỗi UID chỉ có đúng một dòng `CLUB_CITY_CHANGE`.
- Giữ nguyên các dòng tên, tên ngắn, affiliate và các nội dung không liên quan.
- Nếu dòng city đã đúng thì không sửa lại.

## 5. Cập nhật geography

Khi người dùng cung cấp City ID mới:

- Thêm `CITY_NAME_CHANGE` vào đúng quốc gia và đúng local region.
- Các dòng `CITY_NAME_CHANGE` trong mỗi nhóm/khu vực phải được sắp xếp theo thứ tự ID tăng dần (ngoại lệ: với Taipei thì thành phố chuẩn, với Japan thì dòng `-ken`/tỉnh, với Malaysia thì dòng bang `Negeri ...` luôn được ưu tiên đặt ở đầu nhóm).
- Định dạng phân biệt tên thành phố trùng nhau (disambiguation): với Armenia dùng `<tên> marz` (ví dụ: `"Agharak, Aragatsotn marz"`), với Azerbaijan dùng `<tên> rayonu` (trừ Bakı) (ví dụ: `"Xırdalan, Abşeron rayonu"`, `"Suraxanı, Bakı"`), với Bulgaria dùng `<tên> oblast` (ví dụ: `"Ivanovo, Blagoevgrad oblast"`), với Russia dùng `<tên> oblast` và `<tên> krai` (ví dụ: `"Kotovo, Belgorod oblast"`, `"Spasskoe, Primorsky krai"`).
- Không thêm kết quả gần giống hoặc không thuộc CLB cần cập nhật.
- Không tạo trùng City ID hoặc trùng bản ghi trong cùng khu vực.

```lnc
"CITY_NAME_CHANGE"		4200006		"Teruel"							""
```

Nếu chưa có City ID và đang dùng `rd-uid`, không thêm dòng giả vào geography.

## 6. Kiểm tra sau cập nhật

Phải xác minh:

1. Mọi UID trong ảnh có đúng một `CLUB_CITY_CHANGE`.
2. Dòng `CLUB_CITY_CHANGE` nằm ngay trên `CLUB_NAME_CHANGE` cùng UID.
3. ID thật khớp đúng city và nation trong geography.
4. Các dòng `CITY_NAME_CHANGE` trong từng nhóm geography được sắp xếp theo ID tăng dần.
5. Số dòng dùng `rd-uid` được báo lại.
6. Không sửa hoặc khôi phục file ngoài phạm vi yêu cầu.
7. Không tự động chạy `git commit` hoặc `git push`.

## 7. Báo cáo kết quả

Báo ngắn gọn:

- File đã cập nhật.
- Tổng số CLB đã kiểm tra.
- Số city dùng ID thật.
- Số city dùng `rd-uid`.
- Geography có được cập nhật hay không.
- Xác nhận không commit/push.
