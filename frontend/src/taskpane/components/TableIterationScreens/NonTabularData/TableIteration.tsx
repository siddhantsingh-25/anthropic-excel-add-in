import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import ScreenshotIcon from "@mui/icons-material/Screenshot";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import PausePresentationIcon from "@mui/icons-material/PausePresentation";
import { OpenTableDialog } from "../../Utilities/OpenImageInputDialog";
import "../../Styles/TableIteration.css";
import Footer from "../../Footer";
import UndoIcon from "@mui/icons-material/Undo";

import Tooltip from "@mui/material/Tooltip";

import { writeToExcelMock } from "../../../office-document";
import { initializeExcelAddin } from "../../Utilities/Excel/BindCellEvent";
import { JsonData } from "../../Types"; // Import your JsonData type definition

const TableIteration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { response } = (location.state || {}) as { response: string };
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [NotificationBar, setNotificationBar] = useState(false);
  const [cellAddress, setCellAddress] = useState("");
  const [undoStack, setUndoStack] = useState<
    { headerIndex: number; rowIndex: number; cellAddress: string; previousValue: string; addedValue: string }[]
  >([]);
  const [cellChanges, setCellChanges] = useState<{ [key: string]: string[] }>({});

  const parsedData: JsonData = response ? JSON.parse(response) : { data: { RowData: [] } };

  useEffect(() => {
    if (!parsedData.data.RowData[0]?.hasOwnProperty("Key")) {
      navigate("/TabularTable", { state: { response: response } });
    }
  }, [parsedData, navigate]);
  useEffect(() => {
    initializeExcelAddin(setCellAddress);
  }, []);

  // Parse the JSON response into your JsonData type

  // Extracting RowData and filtering out unnecessary fields
  const filteredDataNonTabular = parsedData.data.RowData.map(({ Key, Value }) => ({
    [Key]: Value,
  }));

  // State to hold filtered data
  const [data, setData] = useState(filteredDataNonTabular);

  // Function to handle clicking on Next button
  const handleNextButtonClick = () => {
    if (currentIndex < data.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setNotificationBar(true); // Show notification bar when reaching the end
    }
  };
  const handleUndoClick = async () => {
    if (undoStack.length > 0) {
      const { headerIndex, rowIndex, cellAddress, previousValue } = undoStack[undoStack.length - 1];
      try {
        await writeToExcelMock(previousValue, cellAddress);
        console.log("Undo successful");

        // Update cellChanges
        setCellChanges((prev) => ({
          ...prev,
          [cellAddress]: prev[cellAddress].slice(0, -1),
        }));

        // Update undoStack
        setUndoStack((prevStack) => prevStack.slice(0, -1));

        setCurrentHeaderIndex(headerIndex);
        setCurrentIndex(rowIndex);
        handlePreviousButtonClick();
      } catch (error) {
        console.error("Undo failed: ", error);
      }
    }
  };

  // const handleUndoClick = async () => {
  //   if (undoStack.length > 0) {
  //     const { headerIndex, rowIndex, cellAddress, previousValue, addedValue } = undoStack[undoStack.length - 1];
  //     try {
  //       const currentValue = await readFromExcel(cellAddress);
  //       let valueToWrite = previousValue;

  //       // Check if both values are numbers
  //       if (!isNaN(Number(currentValue)) && !isNaN(Number(addedValue))) {
  //         valueToWrite = (Number(currentValue) - Number(addedValue)).toString();
  //       }

  //       await writeToExcelMock(valueToWrite, cellAddress);
  //       console.log("Undo successful");
  //       setUndoStack((prevStack) => prevStack.slice(0, -1));
  //       setCurrentHeaderIndex(headerIndex);
  //       setCurrentIndex(rowIndex);
  //       handlePreviousButtonClick();
  //     } catch (error) {
  //       console.error("Undo failed: ", error);
  //     }
  //   }
  // };

  // Function to handle clicking on Previous button
  const handlePreviousButtonClick = () => {
    if (NotificationBar) {
      setNotificationBar(false); // Clear the notification bar if it's visible
    }

    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        return prevIndex - 1; // Move to the previous index if it's greater than 0
      } else {
        // If prevIndex is 0, wrap around to the last index
        return data.length - 1;
      }
    });
  };

  // Function to handle opening a dialog
  const openTableDialog = () => {
    OpenTableDialog(parsedData, "fullScreen", currentIndex, currentHeaderIndex, "No Image").then((res) => {
      console.log(res);
    });
  };

  // Function to handle adding a new screenshot
  const addNewScreenshot = () => {
    navigate("/ImageInput");
  };

  // Function to handle pause/play button click
  const handlePausePlayClick = () => {
    setIsPaused(!isPaused);
  };

  // Function to reset iteration
  const reset = () => {
    setCurrentHeaderIndex(0);
    setCurrentIndex(0);
  };
  // Function to handle selection change (e.g., writing to Excel)
  useEffect(() => {
    if (cellAddress !== "") {
      if (!isPaused && !NotificationBar) {
        handleSelectionChange();
      }
    }
  }, [cellAddress]);

  // const handleSelectionChange = async () => {
  //   const valueToWrite = Object.values(filteredDataNonTabular[currentIndex])[0] || "";
  //   console.log(`Writing value: ${valueToWrite} to cell: ${cellAddress}`);
  //   try {
  //     const previousValue = await readFromExcel(cellAddress);
  //     let newValue = "0"; // Default to "0" for blank or null values

  //     if (valueToWrite != null && valueToWrite !== "") {
  //       newValue = valueToWrite.toString();
  //     }

  //     // Check if both values are numbers
  //     if (!isNaN(Number(previousValue)) && !isNaN(Number(newValue))) {
  //       newValue = (Number(previousValue) + Number(newValue)).toString();
  //     }

  //     setUndoStack((prevStack) =>
  //       [
  //         ...prevStack,
  //         {
  //           headerIndex: currentHeaderIndex,
  //           rowIndex: currentIndex,
  //           cellAddress,
  //           previousValue,
  //           addedValue: newValue, // Store the actual value added
  //         },
  //       ].slice(-10)
  //     );

  //     await writeToExcelMock(newValue, cellAddress);
  //     console.log("Excel write complete");
  //     handleNextButtonClick();
  //   } catch (error) {
  //     console.error("Excel write failed: ", error);
  //   }
  // };
  const handleSelectionChange = async () => {
    const valueToWrite = Object.values(filteredDataNonTabular[currentIndex])[0] || "";
    console.log(`Writing value: ${valueToWrite} to cell: ${cellAddress}`);

    if (valueToWrite == null || valueToWrite === "") {
      handleNextButtonClick();
      return;
    }

    try {
      const previousValue = await readFromExcel(cellAddress);
      let newValue = valueToWrite.toString();

      // Check if both values are numbers
      if (!isNaN(Number(previousValue)) && !isNaN(Number(newValue))) {
        newValue = (Number(previousValue) + Number(newValue)).toString();
      }

      // Update cellChanges
      setCellChanges((prev) => ({
        ...prev,
        [cellAddress]: [...(prev[cellAddress] || []), previousValue],
      }));

      // Update undoStack
      setUndoStack((prevStack) =>
        [
          ...prevStack,
          {
            headerIndex: currentHeaderIndex,
            rowIndex: currentIndex,
            cellAddress,
            previousValue,
            addedValue: newValue, // Store the actual value added
          },
        ].slice(-10)
      );

      await writeToExcelMock(newValue, cellAddress);
      console.log("Excel write complete");
      handleNextButtonClick();
    } catch (error) {
      console.error("Excel write failed: ", error);
    }
  };
  const readFromExcel = async (cellAddress: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      Excel.run(async (context) => {
        try {
          const sheet = context.workbook.worksheets.getActiveWorksheet();
          const range = sheet.getRange(cellAddress);
          range.load("values");
          await context.sync();
          const cellValue = range.values[0][0];
          resolve(cellValue);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  return (
    <>
      <div className="table-iteration-container">
        <h2 className="table-iteration-title" style={{ textAlign: "center", marginBottom: "0" }}>
          Iteration
        </h2>
  
        {NotificationBar ? (
          <div className="CurrentBox1">
            <h1>You have reached the end.</h1>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ marginBottom: "0", marginRight: "10px", marginTop: "0" }}>Current</h3>
            </div>
            <div className="CurrentBox">
              <div className="CurrentBoxContent">
                <div className="currentBoxHeader">{Object.keys(filteredDataNonTabular[currentIndex])[0]}</div>
                <div className="currentBoxValue">{Object.values(filteredDataNonTabular[currentIndex])[0]}</div>
              </div>
            </div>
            <h3 style={{ marginBottom: "8px" }}>Next</h3>
            <div className="NextBox">
              {currentIndex < data.length - 1 && (
                <>
                  <div className="NextBoxContent">
                    <div className="NextBoxHeader">{Object.keys(filteredDataNonTabular[currentIndex + 1])[0]}</div>
                    <div className="NextBoxValue">{Object.values(filteredDataNonTabular[currentIndex + 1])[0]}</div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
  
        <div className="iteration_buttons" style={{ marginTop: "8px" }}>
          <div className="table-iteration-actions" style={{ paddingBottom: "10px" }}>
            <Tooltip title="Pause/Resume">
              <Button
                className="table-iteration-button"
                onClick={handlePausePlayClick}
                style={{
                  minWidth: "40px",
                  width: "40px",
                  height: "40px",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "blue",
                  color: "white",
                }}
              >
                {isPaused ? <SmartDisplayIcon fontSize="medium" /> : <PausePresentationIcon fontSize="medium" />}
              </Button>
            </Tooltip>
            <Tooltip title="Skip Cell">
              <Button
                className="table-iteration-button skip_button"
                onClick={handleNextButtonClick}
                style={{
                  minWidth: "40px",
                  width: "40px",
                  height: "40px",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "blue", // Adjust the color as needed
                  color: "white",
                }}
              >
                <SkipNextIcon fontSize="medium" />
              </Button>
            </Tooltip>
            <div style={{ width: "40px", height: "auto", display: "inline-block" }}></div>
            <Tooltip title="Undo">
              <Button
                className="table-iteration-button"
                onClick={handleUndoClick}
                disabled={undoStack.length === 0}
                style={{
                  minWidth: "40px",
                  width: "40px",
                  height: "40px",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "red",
                  color: "white",
                }}
              >
                <UndoIcon fontSize="medium" />
              </Button>
            </Tooltip>
            <Tooltip title="Restart Iteration">
              <Button
                className="table-iteration-button restart_button"
                onClick={reset}
                style={{
                  minWidth: "40px", // Ensures the button is square-shaped
                  width: "40px",
                  height: "40px",
                  padding: "0", // Removes padding to prevent enlarging
                  display: "flex", // Uses flex to center the content
                  alignItems: "center", // Centers content vertically
                  justifyContent: "center", // Centers content horizontally
                  backgroundColor: "red", // Example color
                  color: "white", // Example text/icon color
                }}
              >
                <RestartAltIcon fontSize="medium" />
              </Button>
            </Tooltip>
          </div>
          <div className="table-iteration-actions" style={{ marginTop: "12px" }}>
            <Tooltip title="Return to Home Screen">
              <Button
                className="table-iteration-button"
                onClick={addNewScreenshot}
                style={{ backgroundColor: "red", color: "white" }}
              >
                Start Over
              </Button>
            </Tooltip>
            <Tooltip title="Open Full Screen View">
              <Button
                className="table-iteration-button"
                onClick={openTableDialog}
                style={{
                  minWidth: "40px", // Ensures the button is square-shaped
                  width: "40px",
                  height: "40px",
                  padding: "0", // Removes padding to prevent enlarging
                  display: "flex", // Uses flex to center the content
                  alignItems: "center", // Centers content vertically
                  justifyContent: "center", // Centers content horizontally
                  backgroundColor: "blue",
                  color: "white",
                }}
              >
                <FullscreenIcon fontSize="medium" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );  
};

export default TableIteration;
