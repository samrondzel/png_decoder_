const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const {getMostFrequentPixels} = require("./pngDecoder");

console.dir(getMostFrequentPixels);

const app = express();
const router = express.Router();

app.use(cors());
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


router.post("/image", bodyParser.raw({ type: ["image/png"], limit: "5mb" }), (req,res) => {
  let image = req.body;
  console.log("Getting post request");
  console.log(image);

  const {mostFrequentColors, totalPixelOccurences} = getMostFrequentPixels(image);
  if(mostFrequentColors !== undefined && totalPixelOccurences !== undefined){
    let imagesDir = path.join(__dirname, "..", "..", "client", "src", "pages", "image.png");
    fs.writeFile(imagesDir, image, (err) => {console.log(err)});
    res.json({mostFrequentColors, totalPixelOccurences});
  }else{
    res.json({message: "Image is not supported. Choose another"});
  }
});

app.use(router);
app.listen(3001, () => console.log("Server is started"));
