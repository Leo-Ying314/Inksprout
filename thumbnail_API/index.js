const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const app = express();
const PORT = 8080;

const textAlignValues = ["start", "middle", "end"];
const fontSizeValues = {
  small_extra: 150,
  small: 200,
  medium: 300,
  large: 400,
  large_extra: 500,
};

// Static Width (Plain Regex)
const wrapStatic = (s) => s.replace(/(?![^\n]{1,32}$)([^\n]{1,32})\s/g, "$1\n");

// Dynamic Width (Build Regex)
const wrapDynamic = (s, w) =>
  s.replace(new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, "g"), "$1\n");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post("/thumbnail", upload.single("file"), async (req, res) => {
  try {
    const { text, textAlignment = "middle", fontSize = "medium" } = req.body;

    if (!textAlignValues.includes(textAlignment)) {
      return res.status(400).send({
        error: "Invalid text alignment. Valid inputs = {start, middle, end}",
      });
    }

    if (!fontSizeValues[fontSize]) {
      return res.status(400).send({
        error:
          "Invalid font size. Valid inputs = {small_extra, small, medium, large, large_extra}",
      });
    }

    if (text.length > 100) {
      return res.status(400).send("Text is too long");
    }

    if (/[^\w\s.,!?-]/.test(text)) {
      return res
        .status(400)
        .send({ error: "Text contains unsupported characters" });
    }
    const inputPath = req.file.path;
    const outputPath = `uploads/processed-${req.file.filename}`;

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const wrappedText = wrapDynamic(text, 32); // Adjust the width as needed

    const lines = wrappedText.split('\n');
    const lineHeight = fontSizeValues[fontSize] * 1.2; // Adjust line height as needed

    const svgLines = lines.map((line, index) => {
      const y = 50 + (index * lineHeight); // Adjust starting y position
      return `<tspan x="50%" dy="${index === 0 ? '0' : lineHeight}" text-anchor="${textAlignment}" alignment-baseline="middle">${line}</tspan>`;
    }).join('');

    const svgText = `
      <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .title { fill: black; font-size: ${fontSizeValues[fontSize]}px; font-family: Arial, sans-serif; }
        </style>
        <text x="50%" y="50%" class="title">${svgLines}</text>
      </svg>
    `;

    const buffer = await image
      .composite([{ input: Buffer.from(svgText), gravity: "center" }])
      .toBuffer();

    await sharp(buffer).toFile(outputPath);

    res.download(outputPath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error processing image");
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`It's alive on http://localhost:${PORT}`);
});
