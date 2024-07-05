const express = require("express");
const sharp = require("sharp");

const app = express(); // application object
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
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
  try {
    const { text, textAlignment = "middle", fontSize = "medium" } = req.body; // Default text alignment and font size

    // General error handling/invalid requests
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

    const buffer = req.body; // Direct access of raw binary data from request body

    const image = sharp(buffer); // Using sharp/image manipulation on created buffer
    const metaData = await image.metadata(); // Metadata to set height and width of text overlay (reference svgText)

    const svgText = `
      <svg width="${metaData.width}" height="${metaData.height}">
        <style>
          .title { fill: black; font-size: ${fontSizeValues[fontSize]}px; font-family: Arial, sans-serif; }
        </style>
        <text x="50%" y="50%" text-anchor="${textAlignment}" class="title" dy=".3em">${text}</text>
      </svg>
    `;

    // Create output image, which is subsequently pushed to the response object as base64
    const outputImage = await image
      .composite([
        {
          input: Buffer.from(svgText),
        },
      ])
      .toFormat("png");

    // Response object
    res.status(200).json({
      message: "Image uploaded successfully",
      data: outputImage.toString("base64"),
    });
  } catch {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`It's alive on http://localhost:${PORT}`);
});
