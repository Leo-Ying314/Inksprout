const express = require("express");
const sharp = require("sharp");
const fs = require("fs");

const app = express(); // application object
app.use(express.json()); // middleware to parse requests into JSON. Not necessary but could help handle edge cases
const PORT = 8080;

// text alignment and font size values
const textAlignValues = ["start", "middle", "end"];
const fontSizeValues = {
  small_extra: 150,
  small: 200,
  medium: 250,
  large: 300,
  large_extra: 350,
};

app.post("/thumbnail", async (req, res) => {
  let chunks = [];
  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("error", (err) => {
    console.log(err);
  });

  req.on("end", async () => {
    try {
      const buffer = Buffer.concat(chunks);

      const image = sharp(buffer);
      const metaData = await image.metadata();

      const { text, textAlignment = "middle", fontSize = "medium" } = req.body; // default text alignment and font size

      // error handling
      if (!textAlignValues.includes(textAlignment)) {
        return res.status(400).send({ error: "Invalid text alignment" });
      }

      if (!fontSizeValues[fontSize]) {
        return res.status(400).send({ error: "Invalid font size" });
      }

      if (text.length > 100) {
        return res.status(400).send("Text is too long");
      }

      if (/[^\w\s.,!?-]/.test(text)) {
        return res
          .status(400)
          .send({ error: "Text contains unsupported characters" });
      }

      const svgText = `
      <svg width="${metaData.width}" height="${metaData.height}">
        <style>
          .title { fill: black; font-size: ${font_size[fontsize]}px; font-family: Arial, sans-serif; }
        </style>
        <text x="50%" y="50%" text-anchor="${textalign}" class="title" dy=".3em">${text}</text>
      </svg>
    `;

      const outputBuffer = await image
        .composite([
          {
            input: Buffer.from(svgText),
          },
        ])
        .toFormat("png")
        //.toBuffer();

      res.status(200).json({
        message: "Image uploaded successfully",
        data: outputBuffer.toString("base64"),
      });
    } catch {
      console.error(err);
      res.status(500).send("Server error");
    }
  });
});

app.listen(PORT, () => {
  console.log(`It's alive on http://localhost:${PORT}`);
});
