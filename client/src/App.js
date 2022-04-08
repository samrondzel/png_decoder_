import logo from './logo.svg';
import './App.css';
import {Routes, Route} from "react-router-dom";
import React, {useState} from "react";
import PhotoForm from "./pages/PhotoForm";
import PhotoView from "./pages/PhotoView";


function App() {

  const [image, setImage] = useState("");
  const [mostFrequentColors, setMostFrequentColors] = useState([]);
  const [totalPixelOccurences, setTotalPixelOccurences] = useState(0);

  function submitPhoto(e){
    e.preventDefault();
    setImage(e.target[0].files[0])

        fetch("http://localhost:3001/image", {
            method: "POST",
            headers: {
              "Content-Type": "image/png"
            },
            body: e.target[0].files[0]
          }).then((data) => {
            e.target[0].value = null;
            return data.json();
          }).then((res) => {
            console.log(res);
            let {mostFrequentColors: mostFrequentColors_, totalPixelOccurences: totalPixelOccurences_} = res;
            if(mostFrequentColors_ && totalPixelOccurences_){
              setMostFrequentColors(mostFrequentColors_);
              setTotalPixelOccurences(totalPixelOccurences_);
            }else{
              alert(res.message);
            }
          });
  }

  return (
    <>
      <Routes>
        <Route path = "/" element = {<PhotoForm submitPhoto = {submitPhoto} image = {image}
              mostFrequentColors = {mostFrequentColors} totalPixelOccurences = {totalPixelOccurences}/>}/>
        <Route path = "/photo" element = {<PhotoView/>}/>
      </Routes>
    </>
  );
}

export default App;
