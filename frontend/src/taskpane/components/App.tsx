import * as React from "react";
import Header from "./Header";
import HeroList, { HeroListItem } from "./HeroList";
import ImageInput from "./ImageInput";
import { makeStyles } from "@fluentui/react-components";
import { Ribbon24Regular, LockOpen24Regular, DesignIdeas24Regular } from "@fluentui/react-icons";
import '../styles/App.css';


const App = () => {

  return (
    <div className='app-container'>
      <ImageInput />
    </div>
  );
};

export default App;
