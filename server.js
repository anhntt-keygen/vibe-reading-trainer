const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to fetch reading passages
app.get('/api/passages', (req, res) => {
  const passages = [
    {
      id: "p1",
      title: "Gia đình yêu thương",
      category: "Gia đình",
      level: "easy",
      text: "Nhà em có bố, mẹ và em. Cả nhà em luôn yêu thương nhau.",
      keywords: ["bố", "mẹ", "yêu thương"]
    },
    {
      id: "p2",
      title: "Chú mèo con",
      category: "Động vật",
      level: "easy",
      text: "Chú mèo con có bộ lông màu trắng tinh và đôi mắt tròn xoe.",
      keywords: ["mèo con", "lông", "mắt"]
    },
    {
      id: "p3",
      title: "Bầu trời mùa hè",
      category: "Thiên nhiên",
      level: "medium",
      text: "Mùa hè đến mang theo những tia nắng vàng rực rỡ và bầu trời trong xanh cao vút.",
      keywords: ["mùa hè", "nắng vàng", "bầu trời"]
    },
    {
      id: "p4",
      title: "Trường học thân yêu",
      category: "Trường học",
      level: "medium",
      text: "Trường học là ngôi nhà thứ hai, nơi có thầy cô mến yêu và bạn bè thân thiết.",
      keywords: ["trường học", "thầy cô", "bạn bè"]
    },
    {
      id: "p5",
      title: "Bảo vệ môi trường xanh",
      category: "Thiên nhiên",
      level: "hard",
      text: "Chúng ta cần chung tay trồng thêm nhiều cây xanh, hạn chế rác thải nhựa để bảo vệ trái đất luôn tươi đẹp.",
      keywords: ["chung tay", "cây xanh", "rác thải", "trái đất"]
    }
  ];
  res.json(passages);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Vibe Reading Trainer] Server is running on http://localhost:${PORT}`);
});
```

---