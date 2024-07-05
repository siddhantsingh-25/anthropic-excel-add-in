import * as React from "react";
import { makeStyles } from "@fluentui/react-components";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import TableIteration from "./TableIterationScreens/NonTabularData/TableIteration";
import ImageInput from "./imageInput";
import TabularData from "./TableIterationScreens/TabularData";
import Home from "./Home";
import Login from "./Login";
interface AppProps {
  title: string;
}

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
  },
});

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  // The list items are static and won't change at runtime,
  // so this should be an ordinary const, not a part of state.

  return (
    <div className={styles.root}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={window.localStorage.getItem("ocr_access_token") === null ? <Login /> : <ImageInput />}
          />
          <Route path="/Home" element={<Home />} />
          <Route path="/ImageInput" element={<ImageInput />} />
          <Route path="/TableIteration" element={<TableIteration />} />
          <Route path="/TabularTable" element={<TabularData />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
