const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const inputImage = path.join(__dirname, '/images/cookies.jpg');
const outputImage = path.join(__dirname, '/images/cookies_new.jpg');
const captionText = "1000+ Shares in 24 Hours 😭";
const fontPath = path.join(__dirname, '/fonts/Lobster/Lobster-Regular.ttf');

ffmpeg(inputImage)
  .outputOptions([
    '-vf', `drawtext=text='${captionText}':fontcolor=black:fontsize=150:fontfile=${fontPath}:x=(w-text_w)/2:y=(h-text_h)/4`,
    '-y'
  ])
  .save(outputImage)
  .on('end', () => {
    console.log('Image with caption created successfully!');
  })
  .on('error', (err) => {
    console.error('Error adding caption:', err);
  });
