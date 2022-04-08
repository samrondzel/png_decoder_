const fs = require("fs");
const pako = require("pako");

function getMostFrequentPixels(imgData){
  // fs.readFile("screen.png", (err, imgData) => {
    const PNG_FORMAT_ID = "89504e470d0a1a0a";
    if(imgData.slice(0,8).toString("hex") === PNG_FORMAT_ID){
      let formatFieldLength = 8;
      let lengthFieldLength = 4;
      let typeFieldLength = 4;
      let CRCFieldLength = 4;
      let image = {width: 0, height: 0, bitDepth: 0, colorType: 0, compressionMethod: 0,  filterMethod: 0, interlacedMethod: 0};

      //PNG = series of chunks => Get the data from all the chunks
      let pointer = formatFieldLength;
      let imageData = new Uint8Array();
      while(pointer < imgData.length){
        let currentChunkLength = Array.from(imgData.slice(pointer, pointer + lengthFieldLength));
        let currentChunkLengthInt = currentChunkLength[3] + currentChunkLength[2] * Math.pow(16,2)
        + currentChunkLength[1] * Math.pow(16,3) + currentChunkLength[0] * Math.pow(16,3);
        let chunkType = imgData.slice(pointer + lengthFieldLength, pointer + lengthFieldLength + typeFieldLength).toString();
        console.log("Chunk: " + chunkType);

        let chunkData = imgData.slice(pointer + lengthFieldLength + typeFieldLength,
          pointer + lengthFieldLength + typeFieldLength + currentChunkLengthInt);

          if(chunkType === "IHDR"){
            let imageWidthArray = Array.from(chunkData.slice(0, 4));
            image.width = imageWidthArray[3] + imageWidthArray[2] * Math.pow(16,2)
            + imageWidthArray[1] * Math.pow(16,3) + imageWidthArray[0] * Math.pow(16,3);
            let imageHeightArray = chunkData.slice(4, 8);
            image.height = imageHeightArray[3] + imageHeightArray[2] * Math.pow(16,2)
            + imageHeightArray[1] * Math.pow(16,3) + imageHeightArray[0] * Math.pow(16,3);
            image.bitDepth = chunkData.slice(8, 9)[0];
            image.colorType = chunkData.slice(9, 10)[0];
            image.compressionMethod = chunkData.slice(10, 11)[0];
            image.filterMethod = chunkData.slice(11, 12)[0];
            image.interlacedMethod = chunkData.slice(12, 13)[0];

            console.log(image);
            if (image.bitDepth !== 8) throw new Error("bitDepth not supported");
            if (image.colorType !== 6)
              return "Png image is not supported";
            if (image.compressionMethod !== 0) throw new Error("compressionMethod not supported");
            if (image.filterMethod !== 0) throw new Error("filterMethod not supported");
            if (image.interlacedMethod !== 0) throw new Error("Interlacing not supported");

          }else if(chunkType === "IDAT"){
            console.log(chunkData);
            const tmp = imageData;
            imageData = new Uint8Array(tmp?.length + chunkData.length);
            imageData.set(tmp);
            imageData.set(chunkData, tmp.length);
          }

          pointer += lengthFieldLength + typeFieldLength + currentChunkLengthInt + CRCFieldLength;
        }

        console.log("Encoded Image Data: ", imageData);
        let decodedImageData = pako.inflate(imageData);
        console.log("Decoded Image Data: ", decodedImageData);

        let lineWidth = image.width * 4 + 1; //Line width = bytes for pixels of image + filter byte
        let indexer = 0;

        //Get occurences of all pixels
        let pixelsOccurences = {};
        let totalPixelOccurences = 0;
        while(indexer < decodedImageData.length){
          let line = decodedImageData.slice(indexer, indexer + lineWidth);
          let filter = line[0];

          for(let i = 1; i < line.length; i+=4){
            let newPixel = line[i] + "," + line[i + 1] + "," + line[i + 2];
            //filter out empty pixels
            if(!(line[i + 3] === 0)){
              //Filter out all blackish colors
              if(!(Math.abs(line[i] - line[i + 1]) <= 10 && Math.abs(line[i] - line[i + 2]) <= 10)){
                totalPixelOccurences++;
                if(pixelsOccurences[newPixel]){
                  pixelsOccurences[newPixel] += 1;
                }else{
                  pixelsOccurences[newPixel] = 1;
                }
              }
            }
          }
          indexer += lineWidth;
        }
        console.log(pixelsOccurences);
        //Get 5 most frequent colors
        let pixelsKeys = Object.keys(pixelsOccurences);
        let mostFrequentColors = [];
        for(let i = 0; i < 5; i++){
          mostFrequentColors.push({frequency:0});
        }

        pixelsKeys.forEach((pixelKey, i) => {
          let pixelFrequency = pixelsOccurences[pixelKey];
          let isColorChanged = false;
          mostFrequentColors = mostFrequentColors.map((color, i) => {
            if(color.frequency < pixelFrequency && !isColorChanged){
              isColorChanged = true;
              return {pixel: pixelKey, frequency: pixelFrequency};
            }
            return color;
          });
          mostFrequentColors.sort((c1, c2) => c1.frequency - c2.frequency)
        });

        mostFrequentColors.sort((c1, c2) => c2.frequency - c1.frequency)
        console.log(mostFrequentColors)

        return {mostFrequentColors, totalPixelOccurences}
      }else{
        return "Choose png format";
      }
      // });
}

exports.getMostFrequentPixels = getMostFrequentPixels;
