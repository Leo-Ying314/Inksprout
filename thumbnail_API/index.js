const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const bodyParser = require('body-parser');

const app = express();
app.use(express.json());
const PORT = 8080;

const text_align = ['left', 'center', 'right'];
const font_size = {
  small_extra: 150,
  small: 200,
  medium: 250,
  large: 300,
  large_extra: 350
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname)
  }
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/thumbnail', upload.single('file'), async (req, res) => {
  res.json(req.file);
  try {
    const { text, textalign = 'center', fontsize = 'medium' } = req.body;

    if (!text_align.includes(textalign)) {
      return res.status(400).send({ error: "Invalid text alignment" });
    }

    if (!font_size[fontsize]) {
      return res.status(400).send({ error: "Invalid font size" });
    }

    if (text.length > 100) {
      return res.status(400).send('Text is too long');
    }

    if (/[^\w\s.,!?-]/.test(text)) {
      return res.status(400).send({ error: "Text contains unsupported characters" });
    }

    const inputPath = req.file.path;
    const outputPath = `uploads/processed-${req.file.filename}`;

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const svgText = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <style>
          .title { fill: black; font-size: ${font_size[fontsize]}px; font-family: Arial, sans-serif; }
        </style>
        <text x="50%" y="50%" text-anchor="${textalign}" class="title" dy=".3em">${text}</text>
      </svg>
    `;

    const buffer = await image
      .composite([{ input: Buffer.from(svgText), gravity: 'center' }])
      .toBuffer();

    await sharp(buffer).toFile(outputPath);

    res.download(outputPath, err => {
      if (err) {
        console.error(err);
        res.status(500).send('Error processing image');
      }
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`It's alive on http://localhost:${PORT}`);
});
