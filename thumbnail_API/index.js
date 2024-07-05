const express = require("express");
const sharp = require("sharp");
const fs = require("fs");

const app = express(); // application object
app.use(express.json()); // middleware to parse requests into JSON. Not necessary but could help handle edge cases
const PORT = 8080;

// text alignment and font size values
const text_align = ["start", "middle", "end"];
const font_size = {
  small_extra: 150,
  small: 200,
  medium: 250,
  large: 300,
  large_extra: 350,
};

app.post("/thumbnail", async (req, res) => {
  // post request which utilzies multer middleware to upload file
  try {
    // try - catch block for error handling
    const { text, textalign = "middle", fontsize = "medium" } = req.body; // default text alignment and font size

    // error handling
    if (!text_align.includes(textalign)) {
      return res.status(400).send({ error: "Invalid text alignment" });
    }

    if (!font_size[fontsize]) {
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

    // image processing utilizing sharp

    const inputStream = fs.createReadStream(req.file.path);
    const outputStream = new PassThrough();

    const svgText = `
      <svg width="500" height="500">
        <style>
          .title { fill: black; font-size: ${font_size[fontsize]}px; font-family: Arial, sans-serif; }
        </style>
        <text x="50%" y="50%" text-anchor="${textalign}" class="title" dy=".3em">${text}</text>
      </svg>
    `;

    const transformStream = sharp()
      .composite([
        {
          input: Buffer.from(svgText),
        },
      ])
      .toFormat("png");

    inputStream.pipe(transformStream).pipe(outputStream);

    let chunks = [];
    outputStream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    outputStream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      res.status(200).json({
        message: "Image uploaded successfully.",
        data: buffer.toString("base64"),
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`It's alive on http://localhost:${PORT}`);
});