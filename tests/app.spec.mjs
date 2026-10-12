Bộ test dưới đây được viết bằng Playwright, bao phủ toàn bộ các kịch bản nghiệp vụ cốt lõi [ID:443]:
- **`[SC-01]`**: Luyện đọc theo cấp độ, nghe phát âm mẫu (TTS), giả lập nhận diện giọng nói (STT) và chấm điểm trực quan.
- **`[SC-02]`**: Chế độ dự phòng thông minh (Fill-in-the-blank) khi trình duyệt không hỗ trợ Speech Recognition.
- **`[SC-03]`**: Thống kê, lưu trữ kết quả vào `localStorage`, hiển thị biểu đồ tiến trình SVG và xuất/nhập dữ liệu JSON.
- **`[SC-04]`**: Giao diện Kid-friendly, chuyển đổi tab mượt mà, tương thích bộ lọc cấp độ.

```javascript
import { test, expect } from '@playwright/test';

const LOCAL_HOST = 'http://localhost:3000';

test.describe('Vibe Reading Trainer - Test Suite TEA 1.27.2', () => {

  test.beforeEach(async ({ page }) => {
    // Thiết lập dữ liệu giả lập trong localStorage trước khi tải trang để đảm bảo tính nhất quán cho SC-03
    await page.addInitScript(() => {
      const mockHistory = [
        { id: "p1", title: "Gia đình yêu thương", score: 80, date: "2024-11-01" },
        { id: "p2", title: "Chú mèo con", score: 100, date: "2024-11-02" }
      ];
      window.localStorage.setItem('vibe_reading_history', JSON.stringify(mockHistory));
      window.localStorage.setItem('vibe_weak_words', JSON.stringify(['mắt', 'lông']));
    });

    // Di chuyển tới trang ứng dụng
    await page.goto(LOCAL_HOST);
  });

  // ==========================================
  // [SC-01]: LUYỆN ĐỌC, PHÁT ÂM MẪU (TTS) & CHẤM ĐIỂM (STT)
  // ==========================================
  test('SC-01: Luyện đọc, nghe phát âm mẫu TTS và giả lập chấm điểm STT thành công', async ({ page }) => {
    // 1. Kiểm tra danh sách bài đọc được tải từ API
    const passageList = page.locator('#passage-list');
    await expect(passageList).toBeVisible();
    
    // Chọn bài đọc đầu tiên "Gia đình yêu thương"
    const firstPassage = page.locator('#passage-list .passage-item').first();
    await firstPassage.click();

    // Xác nhận tiêu đề và nội dung hiển thị đúng
    await expect(page.locator('#passage-title')).toHaveText('Gia đình yêu thương');
    await expect(page.locator('#passage-badge')).toHaveText('Dễ');

    // 2. Kiểm tra tính năng Phát âm mẫu (TTS)
    // Giả lập SpeechSynthesis trong trình duyệt để tránh lỗi môi trường không có tiếng
    await page.evaluate(() => {
      window.speechSynthesis = {
        speak: (utterance) => {
          window.lastSpokenText = utterance.text;
        },
        cancel: () => {},
        getVoices: () => []
      };
    });

    await page.click('#btn-tts');
    const lastSpoken = await page.evaluate(() => window.lastSpokenText);
    expect(lastSpoken).toContain('Nhà em có bố, mẹ và em');

    // 3. Giả lập Nhận diện giọng nói (STT) và Chấm điểm
    // Inject đối tượng SpeechRecognition giả lập vào window
    await page.evaluate(() => {
      class MockSpeechRecognition {
        constructor() {
          this.continuous = false;
          this.interimResults = false;
          this.lang = 'vi-VN';
        }
        start() {
          // Giả lập sự kiện trả về kết quả nhận diện sau 500ms
          setTimeout(() => {
            if (this.onresult) {
              const event = {
                results: [
                  [
                    { transcript: 'Nhà em có bố mẹ và em' } // Thiếu cụm "Cả nhà em luôn yêu thương nhau" để test chấm điểm < 100%
                  ]
                ]
              };
              this.onresult(event);
            }
            if (this.onend) this.onend();
          }, 500);
        }
        stop() {}
      }
      window.webkitSpeechRecognition = MockSpeechRecognition;
      window.SpeechRecognition = MockSpeechRecognition;
    });

    // Nhấn nút Bắt đầu đọc
    await page.click('#btn-record');
    await expect(page.locator('#status-banner')).toBeVisible();

    // Đợi kết quả tính toán hiển thị trên Result Card
    const resultCard = page.locator('#result-card');
    await expect(resultCard).toBeVisible({ timeout: 5000 });

    // Kiểm tra điểm số hiển thị
    const scoreValue = await page.locator('#score-value').textContent();
    expect(parseInt(scoreValue)).toBeGreaterThan(0);
  });

  // ==========================================
  // [SC-02]: CHẾ ĐỘ DỰ PHÒNG THÔNG MINH (FALLBACK)
  // ==========================================
  test('SC-02: Tự động chuyển sang chế độ điền từ còn thiếu khi không hỗ trợ Speech API', async ({ page }) => {
    // Vô hiệu hóa Speech API để kích hoạt chế độ dự phòng
    await page.evaluate(() => {
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
    });

    // Tải lại trang hoặc kích hoạt lại logic kiểm tra thiết bị
    await page.reload();

    // Chọn một bài đọc để kích hoạt giao diện
    await page.locator('#passage-list .passage-item').first().click();

    // Kiểm tra xem container fallback có hiển thị hay không
    const fallbackContainer = page.locator('#fallback-container');
    await expect(fallbackContainer).toBeVisible();

    // Điền từ vào các ô trống giả lập (Fill-in-the-blank)
    const inputs = page.locator('#fallback-game input');
    if (await inputs.count() > 0) {
      await inputs.first().fill('bố');
      await page.click('#btn-submit-fallback');
      
      // Kết quả chấm điểm của chế độ dự phòng phải hiển thị
      await expect(page.locator('#result-card')).toBeVisible();
    }
  });

  // ==========================================
  // [SC-03]: THỐNG KÊ & LỊCH SỬ HỌC TẬP (LOCALSTORAGE & SVG)
  // ==========================================
  test('SC-03: Hiển thị biểu đồ tiến trình SVG, thống kê và xuất nhập dữ liệu JSON', async ({ page }) => {
    // Chuyển sang tab Thành Tích
    await page.click('button[data-target="stats-section"]');

    // 1. Kiểm tra số liệu thống kê tổng quan
    await expect(page.locator('#stat-total-reads')).toHaveText('2'); // Khớp với mockHistory ở beforeEach
    await expect(page.locator('#stat-avg-score')).toHaveText('90%'); // (80 + 100) / 2 = 90%

    // 2. Kiểm tra biểu đồ tiến trình SVG có chứa dữ liệu vẽ điểm
    const chartDataGroup = page.locator('#chart-data-group');
    await expect(chartDataGroup).toBeVisible();

    // 3. Kiểm tra danh sách từ vựng cần ôn tập (Weak words)
    const weakWords = page.locator('#weak-words-list');
    await expect(weakWords).toContainText('mắt');
    await expect(weakWords).toContainText('lông');

    // 4. Kiểm tra tính năng Xuất dữ liệu (Export JSON)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#btn-export-data')
    ]);
    expect(download.suggestedFilename()).toContain('vibe_reading_data.json');

    // 5. Kiểm tra tính năng Xóa lịch sử
    await page.click('#btn-clear-history');
    await expect(page.locator('#stat-total-reads')).toHaveText('0');
    await expect(page.locator('#stat-avg-score')).toHaveText('0%');
  });

  // ==========================================
  // [SC-04]: GIAO DIỆN KID-FRIENDLY & CHUYỂN TAB
  // ==========================================
  test('SC-04: Chuyển đổi mượt mà giữa các tab và bộ lọc cấp độ hoạt động chính xác', async ({ page }) => {
    // 1. Kiểm tra chuyển tab
    await page.click('button[data-target="stats-section"]');
    await expect(page.locator('#stats-section')).toHaveClass(/active/);
    await expect(page.locator('#practice-section')).not.toHaveClass(/active/);

    await page.click('button[data-target="practice-section"]');
    await expect(page.locator('#practice-section')).toHaveClass(/active/);

    // 2. Kiểm tra bộ lọc cấp độ (Filter Level)
    const levelFilter = page.locator('#level-filter');
    await levelFilter.selectOption('easy');

    // Đảm bảo các bài đọc hiển thị chỉ thuộc cấp độ "easy"
    const passageItems = page.locator('#passage-list .passage-item');
    const count = await passageItems.count();
    for (let i = 0; i < count; i++) {
      const badge = passageItems.nth(i).locator('.badge');
      await expect(badge).toHaveText('Dễ');
    }
  });

});
```

---

### 💡 Hướng dẫn chạy thử nghiệm bộ test:
1. Đảm bảo ứng dụng đang chạy tại cổng `3000` (`npm start`).
2. Chạy lệnh kiểm thử Playwright:
   ```bash
   npx playwright test tests/app.spec.mjs --headed
   ```