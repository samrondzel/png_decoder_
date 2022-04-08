import React from "react";
import {Routes, Route} from "react-router-dom";

export default function PhotoForm({submitPhoto, image, mostFrequentColors, totalPixelOccurences}) {
  console.log(mostFrequentColors, totalPixelOccurences);
  console.log(image)

  return (
    <div>
      <h3>Submit a photo in .png format</h3>
      <form onSubmit = {submitPhoto}>
        <input type = "file" accept="image/png"/>
        <button type = "submit">Submit</button>
      </form>
      {
        mostFrequentColors !== [] &&
        <div>
          <h3>Your photo: </h3>
          <img src = {require('./image.png')} height={500} width={500}/>
        </div>
      }
      {
        mostFrequentColors ? mostFrequentColors.map((color, i) => {
          return (
            <h3>Color: {color.pixel} ; frequency: {(color.frequency / totalPixelOccurences * 100).toPrecision(3)} %</h3>
          )
        }) : ""
      }
    </div>
  );
}
