const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const inputImage = path.join(__dirname, '/images/cookies.jpg');
const outputImage = path.join(__dirname, '/images/cookies_new2.jpg');
const fontPath = path.join(__dirname, '/fonts/Lobster/Lobster-Regular.ttf');
rl.question('Enter caption text: ', (captionText) => {
  rl.close();


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
});