const express = require('express');
const multer = require('multer'); // multer is a library that enables file upload 
const sharp = require('sharp');
const bodyParser = require('body-parser');


const app = express(); // application object
app.use(express.json()); // middleware to parse requests into JSON. Not necessary but could help handle edge cases
const PORT = 8080;

// text alignment and font size values
const text_align = ['left', 'center', 'right'];
const font_size = {
  small_extra: 150,
  small: 200,
  medium: 250,
  large: 300,
  large_extra: 350
};

// found in multer documentation - sets destination of uploaded files and ensures consistency in file naming
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // destination set to uploads folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname) // maintains original file name and extention for easier readibility/comprehension
  }
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // file is uploaded using dest. and filename above and is limited to 10 MB

app.post('/thumbnail', upload.single('file'), async (req, res) => { // post request which utilzies multer middleware to upload file
  res.json(req.file);
  try { // try - catch block for error handling
    const { text, textalign = 'center', fontsize = 'medium' } = req.body; // default text alignment and font size

    // error handling
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

    // image processing utilizing sharp
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
