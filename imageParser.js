const fs = require("fs");

const jpgSections_base16 = [[0xff, 0xd8], [0xff, 0xe0], [0xff, 0xdb], [0xff, 0xc0], [0xff, 0xc4], [0xff, 0xda], [0xff, 0xd9]];
const jpgSections = {};
jpgSections[jpgSections_base16[0]] = "Start of image",
jpgSections[jpgSections_base16[1]] = "Application header",
jpgSections[jpgSections_base16[2]] = "Quantization table",
jpgSections[jpgSections_base16[3]] = "Start of frame",
jpgSections[jpgSections_base16[4]] = "Huffman table",
jpgSections[jpgSections_base16[5]] = "Start of scan",
jpgSections[jpgSections_base16[6]] = "End of image"

fs.readFile("img4.jpg", (err, data1) => {
  console.log(data1);
  console.log(jpgSections);

  let imgQuantizationTables = [];
  let imgComponents = [];
  let imgComponentsQuantizationTablesMapping = [];
  let img = {width: 0, height: 0};

  for(let i = 0; i < data1.length - 1; i++){
    let sectionIDLength = 2;
    let next2Bytes = data1.slice(i, i + sectionIDLength).join(",");
    if(jpgSections[next2Bytes]){
      let currentSection = jpgSections[next2Bytes];
      console.log(currentSection);

      if(currentSection === "Huffman table"){
        //Step 1 of decoding: Huffman tables
        let lengthFieldLength = 2;
        let htInfoFieldLength = 1;
        let numberOfSymbolsFieldLength = 16;

        let lengthArray = data1.slice(i + sectionIDLength, i + sectionIDLength + lengthFieldLength);
        let sectionLength = lengthArray[0] * 256 + lengthArray[1]; //To convert 2 hex bytes to number

        let htInfo = data1.slice(i + sectionIDLength + lengthFieldLength,
                      i + sectionIDLength + lengthFieldLength + htInfoFieldLength);
        // console.log("HT Info: " + htInfo[0]);

        let sectionNumberOfSymbolsArray = data1.slice(i + sectionIDLength + lengthFieldLength + htInfoFieldLength,
                      i + sectionIDLength + lengthFieldLength + htInfoFieldLength + numberOfSymbolsFieldLength);
        let numberOfSymbolsArray = [];
        for(let j = 0; j < sectionNumberOfSymbolsArray.length; j++){
          numberOfSymbolsArray.push({"length": j + 1, "numberOfSymbols": sectionNumberOfSymbolsArray[j]});
        }
        // console.log("Lengths: ", numberOfSymbolsArray);

        let symbolsFieldLength = sectionLength - lengthFieldLength - htInfoFieldLength -
                                  numberOfSymbolsFieldLength;
        let symbolsArray = Array.from(
                                      data1.slice(i + sectionIDLength + lengthFieldLength + htInfoFieldLength
                                              + numberOfSymbolsFieldLength,
                                              i + sectionIDLength + lengthFieldLength + htInfoFieldLength
                                              + numberOfSymbolsFieldLength + symbolsFieldLength));
        // console.log("Symbols: ", symbolsArray);
        // console.log("Number of symbols: " + symbolsArray.length);

        //Build the array, that contains symbols with their corresponding lengths
        let symbolLengthArray = [];
        let symbolsArrayIndexer = 0;
        for(let j = 0; j < numberOfSymbolsArray.length; j++){
          let symbolLength = numberOfSymbolsArray[j].length;
          let numberOfSymbolsForLength = numberOfSymbolsArray[j].numberOfSymbols;
          while(numberOfSymbolsForLength > 0){
            symbolLengthArray.push({
                                        "symbol": symbolsArray[symbolsArrayIndexer++],
                                        "length": symbolLength
                                   });
            numberOfSymbolsForLength--;
          }
        }

        //Now, do Huffman Encoding
        //1) Get the frequencies of the symbols: F = 16/L and sort in descending order
        for( let j = 0; j < symbolLengthArray.length; j++){
          symbolLengthArray[j].frequency = parseFloat(
            (numberOfSymbolsArray.length / symbolLengthArray[j].length).toPrecision(3));
        }
        symbolLengthArray.sort((a,b) => a.frequency - b.frequency);
        // console.log(symbolLengthArray);

        //2) Build the Huffman Tree
        ////Step 1: Building heap
        let huffmanHeap = [];
        for( let j = 0; j < symbolLengthArray.length; j++){
          huffmanHeap.push(symbolLengthArray[j]);
        }
        console.log("Huffman Heap (beginning)", huffmanHeap);
        ////Steps 2-4
        while(huffmanHeap.length !== 1){
          let leftNode = huffmanHeap.shift();
          let rightNode = huffmanHeap.shift();
          let internalNode = {
            frequency: leftNode.frequency + rightNode.frequency,
            leftChild: leftNode,
            rightChild: rightNode
          }
          huffmanHeap.push(internalNode);
          huffmanHeap.sort((a,b) => a.frequency - b.frequency);
        }
        console.log("Huffman Heap (end)", huffmanHeap);
        let huffmanTree = huffmanHeap[0];

        ////Step 2: Assigning codes to symbols
        let codesSymbolsArray = assignCodesToSymbols(huffmanTree);
        console.log("Huffman Coding: ", codesSymbolsArray);
        ////Now - extracted the huffman table and decoded the symbols
      }else if(currentSection === "Quantization table"){
        //Step 2 of decoding: Quantization tables
        let lengthFieldLength = 2;
        let qtInfoFieldLength = 1;

        let lengthArray = data1.slice(i + sectionIDLength, i + sectionIDLength + lengthFieldLength);
        let sectionLength = lengthArray[0] * 256 + lengthArray[1]; //To convert 2 hex bytes to number

        let qtInfo = data1.slice(i + sectionIDLength + lengthFieldLength,
                     i + sectionIDLength + lengthFieldLength + qtInfoFieldLength);

        let bytesFieldLength = sectionLength - lengthFieldLength - qtInfoFieldLength;
        console.log(bytesFieldLength);
        let bytesArray = Array.from(data1.slice(i + sectionIDLength + lengthFieldLength + qtInfoFieldLength,
                                      i + sectionIDLength + lengthFieldLength + qtInfoFieldLength + bytesFieldLength));
        imgQuantizationTables.push(bytesArray);
        console.log(bytesArray);
        //Now - extracted the quantization tables
      }else if(currentSection === "Start of frame"){
        //Step 3 of decoding: Start of frame
        let lengthFieldLength = 2;
        let dataPrecisionFieldLength = 1;
        let heightFieldLength = 2;
        let widthFieldLength = 2;
        let numberOfComponentsFieldLength = 1;
        let componentFieldLength = 3;

        let componentsBaseline = i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength
                                 + heightFieldLength + widthFieldLength + numberOfComponentsFieldLength;

        let lengthArray = data1.slice(i + sectionIDLength, i + sectionIDLength + lengthFieldLength);
        let sectionLength = lengthArray[0] * 256 + lengthArray[1]; //To convert 2 hex bytes to number

        let imgHeightArray = data1.slice(i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength,
                     i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength + heightFieldLength);
        img.height = imgHeightArray[0] * 256 + imgHeightArray[1]; //To convert 2 hex bytes to number
        let imgWidthArray = data1.slice(i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength + heightFieldLength,
                    i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength + heightFieldLength + widthFieldLength);
        img.width = imgWidthArray[0] * 256 + imgWidthArray[1]; //To convert 2 hex bytes to number

        let numberOfComponents = data1.slice(
              i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength + heightFieldLength + widthFieldLength,
              i + sectionIDLength + lengthFieldLength + dataPrecisionFieldLength
              + heightFieldLength + widthFieldLength + numberOfComponentsFieldLength)[0];

        console.log("Number of components: " + numberOfComponents);

        let indexer = 0;
        while(numberOfComponents !== 0){
          let currentComponent = data1.slice(componentsBaseline + componentFieldLength * indexer,
                                             componentsBaseline + componentFieldLength * indexer + componentFieldLength);

          imgComponentsQuantizationTablesMapping.push({
            componentId: currentComponent[0],
            quantizationTableId: currentComponent[2]
          })

          numberOfComponents--;
          indexer++;
        }
        console.log(imgComponentsQuantizationTablesMapping);

        //Now - extracted the start of frame
      }else if(currentSection === "Start of scan"){
        //Step 4 of decoding: Start of scan
        ////1st - get rid of 0x00 after 0xff in image data
        let lengthFieldLength = 2;
        let lengthArray = data1.slice(i + sectionIDLength, i + sectionIDLength + lengthFieldLength);
        let sectionLength = lengthArray[0] * 256 + lengthArray[1]; //To convert 2 hex bytes to number

        let imageDataBaseline = i + sectionIDLength + lengthFieldLength;
        let imageData = Array.from(data1.slice(imageDataBaseline, data1.length - sectionIDLength));
        for(let j = 0; j < imageData.length; j++){
          if(imageData[j] === 0xff){
            imageData.splice(j+1,1);
          }
        }

        ////2nd - Dealing w/ 8x8 matrices to which image was broken
        ///////For the purposes of further Huffman decoding - convert image data byte stream into bit stream
        let bitImageData = []
        for(let j = 0; j < imageData.length; j++){
          bitImageData.push(byteToBit(imageData[j]));
        }
        console.log(imageData);
        console.log(bitImageData);
        let YCoeff = 0, CbCoeff = 0, CrCoeff = 0;
        let YMatrix = [], CbMatrix = [], CrMatrix = [];
        let coeffs = [YCoeff, CbCoeff, CrCoeff];
        let matrices = [YMatrix, CbMatrix, CrMatrix];
        console.log(img.height, img.width);
        // for(let y = 0; y < Math.floor(img.height / 8); y++){
        //   for(let x = 0; x < Math.floor(img.width / 8); x++){
        //     for(let j = 0; j < coeffs.length; j++){
        //       let returnObj = buildMatrix(
        //                         bitImageData,
        //                         imgComponentsQuantizationTablesMapping[j].componentId,
        //                         imgQuantizationTables[imgComponentsQuantizationTablesMapping[j].quantizationTableId],
        //                         coeffs[j]);
        //       matrices[j] = returnObj.matrix;
        //       coeffs[j] = returnObj.coeff;
        //       //drawMatrix(...)
        //     }
        //   }
        // }
      }
    }
  }

  console.log("img1.jpg length: " + data1.length);
});

function buildMatrix(bitDate, componentId, quantizationMatrixForComponent, coeff){
  console.log(bitData, componentId, quantizationMatrixForComponent, coeff);
  return {coeff: coeff, matrix: []};
}


function byteToBit(imgByte){
  let imgBit = "";
  let powersOf2 = [1,2,4,8,16,32,64,128];
  for(let i = powersOf2.length - 1; i >= 0; i--){
    if(imgByte - powersOf2[i] >= 0){
      imgByte -= powersOf2[i];
      imgBit += '1';
    }else{
      imgBit += '0'
    }
  }

  return imgBit;
}


function assignCodesToSymbols(huffmanTree){
  let codesSymbolsArray = [];
  visitBranch(huffmanTree.leftChild, "0", codesSymbolsArray);
  visitBranch(huffmanTree.rightChild, "1", codesSymbolsArray);
  return codesSymbolsArray;
}

function visitBranch(node, currentCode, codesSymbolsArray){
  if(!node.leftChild && !node.rightChild){
    codesSymbolsArray.push({symbol: node.symbol, code: currentCode})
  }else{
    visitBranch(node.leftChild, currentCode + "0", codesSymbolsArray);
    visitBranch(node.rightChild, currentCode + "1", codesSymbolsArray);
  }

}
