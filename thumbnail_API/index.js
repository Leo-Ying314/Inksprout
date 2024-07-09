const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const emojiRegex = require("emoji-regex");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const textAlignValues = ["start", "middle", "end"];
const fontSizeValues = {
  small_extra: 150,
  small: 200,
  medium: 300,
  large: 400,
  large_extra: 500,
};
const colorValues = {
  black: "#000000",
  white: "#FFFFFF",
  blue: "#0000FF",
  red: "#FF0000",
  green: "#00FF00",
  orange: "#FFA500",
  grey: "#808080",
  yellow: "#FFFF00",
  purple: "#800080",
};

const wrapDynamic = (s, w) =>
  s.replace(new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, "g"), "$1\n");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"];
  if (token == AUTH_TOKEN) {
    next();
  } else {
    res.status(401).send({ error: "Unauthorized" });
  }
};

app.post(
  "/thumbnail",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        text,
        textAlignment = "middle",
        fontSize = "medium",
        color = "black",
      } = req.body;

      if (!textAlignValues.includes(textAlignment)) {
        return res.status(400).send({
          error:
            "/thumbnail: Invalid text alignment. Valid inputs = {start, middle, end}",
        });
      }

      const regex = emojiRegex();
      if (regex.test(text)) {
        return res.status(400).send({
          error: "/thumbnail: Text contains emojis which are not supported.",
        });
      }

      if (!fontSizeValues[fontSize]) {
        return res.status(400).send({
          error:
            "/thumbnail: Invalid font size. Valid inputs = {small_extra, small, medium, large, large_extra}",
        });
      }

      if (!colorValues[color]) {
        return res.status(400).send({
          error:
            "/thumbnail: Invalid color. Valid inputs = {black, white, grey, blue, red, green, orange, yellow, purple}",
        });
      }

      const inputBuffer = req.file.buffer;

      if (!text) {
        res.set("Content-Type", "image/png");
        res.send(inputBuffer);
      } else {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        const avgCharWidth = fontSizeValues[fontSize] * 0.6; // Approximate average character width
        const maxCharsPerLine = Math.floor(metadata.width / avgCharWidth);
        const maxLines = Math.floor(
          metadata.height / (fontSizeValues[fontSize] * 1.2)
        );
        const maxLength = maxCharsPerLine * maxLines;

        if (text.length > maxLength) {
          return res
            .status(400)
            .send(
              `/thumbnail: Text is too long. The max length is ${maxLength} characters for a ${fontSize} font size.`
            );
        }

        const wrappedText = wrapDynamic(text, maxCharsPerLine); // Adjust the width as needed

        const lines = wrappedText.split("\n");
        const lineHeight = fontSizeValues[fontSize] * 1.2; // Adjust line height as needed

        const totalTextHeight = lines.length * lineHeight;
        const startY = (metadata.height - totalTextHeight) / 2 + lineHeight / 2;

        const svgLines = lines
          .map((line, index) => {
            const y = 50 + index * lineHeight;
            return `<tspan x="50%" dy="${
              index === 0 ? "0" : lineHeight
            }" text-anchor="${textAlignment}" alignment-baseline="middle">${line}</tspan>`;
          })
          .join("");

        const svgText = `
        <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
          <style>
            .title { fill: ${color}; font-size: ${fontSizeValues[fontSize]}px; font-family: Arial, sans-serif; }
          </style>
          <text x="50%" y="${startY}" class="title">${svgLines}</text>
        </svg>
      `;

        const buffer = await image
          .composite([{ input: Buffer.from(svgText), gravity: "center" }])
          .toBuffer();

        res.set("Content-Type", "image/png");
        res.send(buffer);
      }
    } catch (err) {
      console.error("/thumbnail: Something went wrong", err);
      res.status(500).send("Server error");
    }
  }
);

app.listen(PORT, () => {
  console.log(`It's alive on http://localhost:${PORT}`);
});
