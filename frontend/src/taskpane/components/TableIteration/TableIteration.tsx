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
import { OpenTableDialog } from "../Utilities/OpenImageInputDialog";
import "../Styles/TableIteration.css";
import { JsonData } from "../Types";
import { writeToExcelMock } from "../../office-document";
import { initializeExcelAddin } from "../Utilities/Excel/BindCellEvent";
import Checkbox from "@mui/material/Checkbox";

const TableIteration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { response } = (location.state || {}) as { response: string };
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [NotificationBar, setNotificationBar] = useState(false);
  const [cellAddress, setCellAddress] = useState("");
  const [showRowHeaders, setShowRowHeaders] = useState(true);
  const [undoStack, setUndoStack] = useState<{ headerIndex: number; rowIndex: number; cellAddress: string; previousValue: string; addedValue: string }[]>([]);
  const [fullScreenDialog, setFullScreenDialog] = useState(null);

  useEffect(() => {
    initializeExcelAddin(setCellAddress);
  }, []);

  const handlePausePlayClick = () => {
    setIsPaused(!isPaused);
  };

  const reset = () => {
    setCurrentHeaderIndex(0);
    setCurrentIndex(0);
  };

  const parsedData: JsonData = response ? JSON.parse(response) : [];
  const filteredData = parsedData.data.RowData.map(({ isNew, id, ...rest }) => rest);
  const [data, setData] = useState(filteredData);
  console.log(filteredData);
  const currentRow = data[currentIndex];
  const headers = filteredData.length > 0 ? Object.keys(filteredData[0]) : [];
  
  const getRowHeader = (index: number): string => {
    if (data[index] && headers.length > 0) {
      const firstColumnKey = headers[0];
      const rowHeader = data[index][firstColumnKey];
      return rowHeader != null ? rowHeader.toString() : "";
    }
    return "";
  };

  const handleNextButtonClick = () => {
    if (currentHeaderIndex < headers.length - 1) {
      setCurrentHeaderIndex(currentHeaderIndex + 1);
    } else {
      if (currentIndex < data.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentHeaderIndex(0);
      } else {
        setNotificationBar(true);
      }
    }
    updateFullScreenView();
  };

  const handlePreviousButtonClick = () => {
    if (NotificationBar) {
      setNotificationBar(false);
    }
    goToPreviousCell();
    updateFullScreenView();
  };

  const goToPreviousCell = () => {
    setCurrentHeaderIndex((prevHeaderIndex) => {
      if (prevHeaderIndex > 0) {
        return prevHeaderIndex - 1;
      } else {
        setCurrentIndex((prevRowIndex) => {
          if (prevRowIndex > 0) {
            return prevRowIndex - 1;
          } else {
            return data.length - 1;
          }
        });
        return headers.length - 1;
      }
    });
  };

  const openTableDialog = () => {
    OpenTableDialog(parsedData, "fullScreen", currentIndex, currentHeaderIndex, "No Image").then((dialogRef) => {
      setFullScreenDialog(dialogRef);
    });
  };

  const updateFullScreenView = () => {
    if (fullScreenDialog) {
      fullScreenDialog.updateHighlightedCell(currentIndex, currentHeaderIndex);
    }
  };

  const addNewScreenshot = () => {
    navigate("/ImageInput");
  };

  const getNextCellValue = () => {
    if (currentHeaderIndex < headers.length - 1) {
      const value = currentRow[headers[currentHeaderIndex + 1]];
      return value != null ? value.toString() : "";
    } else {
      const nextRow = data[(currentIndex + 1) % data.length];
      const value = nextRow ? nextRow[headers[0]] : null;
      return value != null ? value.toString() : "";
    }
  };
  
  const getNextRowHeader = (): string => {
    if (currentHeaderIndex < headers.length - 1) {
      return getRowHeader(currentIndex);
    } else {
      const nextIndex = (currentIndex + 1) % data.length;
      return getRowHeader(nextIndex);
    }
  };

  useEffect(() => {
    if (cellAddress !== "") {
      if (!isPaused && !NotificationBar) {
        handleSelectionChange();
      }
    }
  }, [cellAddress]);

  const handleSelectionChange = async () => {
    const valueToWrite = currentRow[headers[currentHeaderIndex]];
    console.log(`Writing value: ${valueToWrite} to cell: ${cellAddress}`);
    try {
      const previousValue = await readFromExcel(cellAddress);
      let newValue = "0"; // Default to "0" for blank or null values
  
      if (valueToWrite != null && valueToWrite !== "") {
        newValue = valueToWrite.toString();
      }
  
      // Check if both values are numbers
      if (!isNaN(Number(previousValue)) && !isNaN(Number(newValue))) {
        newValue = (Number(previousValue) + Number(newValue)).toString();
      }
  
      setUndoStack((prevStack) => [
        ...prevStack,
        { 
          headerIndex: currentHeaderIndex, 
          rowIndex: currentIndex, 
          cellAddress, 
          previousValue, 
          addedValue: newValue // Store the actual value added
        },
      ].slice(-10));
  
      await writeToExcelMock(newValue, cellAddress);
      console.log("Excel write complete");
      handleNextButtonClick();
    } catch (error) {
      console.error("Excel write failed: ", error);
    }
  };

  const handleUndoClick = async () => {
    if (undoStack.length > 0) {
      const { headerIndex, rowIndex, cellAddress, previousValue, addedValue } = undoStack[undoStack.length - 1];
      try {
        const currentValue = await readFromExcel(cellAddress);
        let valueToWrite = previousValue;
  
        // Check if both values are numbers
        if (!isNaN(Number(currentValue)) && !isNaN(Number(addedValue))) {
          valueToWrite = (Number(currentValue) - Number(addedValue)).toString();
        }
  
        await writeToExcelMock(valueToWrite, cellAddress);
        console.log("Undo successful");
        setUndoStack((prevStack) => prevStack.slice(0, -1));
        setCurrentHeaderIndex(headerIndex);
        setCurrentIndex(rowIndex);
        goToPreviousCell();
      } catch (error) {
        console.error("Undo failed: ", error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (fullScreenDialog) {
        fullScreenDialog.close();
      }
    };
  }, [fullScreenDialog]);

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
        <h2 className="table-iteration-title" style={{ textAlign: "center" }}>
          Iteration
        </h2>
  
        {NotificationBar ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div className="CurrentBox1">
              <h1>You have reached the end.</h1>
            </div>
          </div>
        ) : (
            <>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0 }}>Current</h3>
            <Checkbox
              checked={showRowHeaders}
              onChange={(e) => setShowRowHeaders(e.target.checked)}
              color="primary"
            />
            <span>Show row headers</span>
          </div>
          <div className={`CurrentBox ${showRowHeaders ? "with-row-header" : ""}`}>
            <div className="currentBoxHeader">{headers[currentHeaderIndex]}</div>
            {showRowHeaders && (
              <div className="currentBoxRowHeader">
                {getRowHeader(currentIndex)}
              </div>
              )}
              <div className="currentBoxValue">
                {currentRow[headers[currentHeaderIndex]] != null
                  ? currentRow[headers[currentHeaderIndex]].toString()
                  : "0"}
              </div>
            </div>
            <h3 style={{ marginBottom: "8px" }}>Next</h3>
            <div className={`NextBox ${showRowHeaders ? "with-row-header" : ""}`}>
              <div className="NextBoxHeader">
                {currentHeaderIndex < headers.length - 1 ? headers[currentHeaderIndex + 1] : headers[0]}
              </div>
              {showRowHeaders && (
                <div className="NextBoxRowHeader">
                  {getNextRowHeader()}
                </div>
              )}
              <div className="NextBoxValue">{getNextCellValue()}</div>
            </div>
          </>
        )}
  
        <div className="table-iteration-actions" style={{ paddingBottom: "10px" }}>
          <Button
            variant="contained"
            startIcon={isPaused ? <SmartDisplayIcon /> : <PausePresentationIcon />}
            onClick={handlePausePlayClick}
          >
            {isPaused ? "Play" : "Pause"}
          </Button>
          <Button
            className="table-iteration-button"
            onClick={openTableDialog}
            startIcon={<FullscreenIcon />}
            style={{ backgroundColor: "blue", color: "white" }}
          >
            Full Screen
          </Button>
        </div>
        <div className="table-iteration-actions">
          <Button
            className="table-iteration-button"
            onClick={handlePreviousButtonClick}
            startIcon={<SkipPreviousIcon />}
            style={{ backgroundColor: "green", color: "white" }}
          >
            Previous
          </Button>
          <Button
            className="table-iteration-button skip_button"
            onClick={handleNextButtonClick}
            endIcon={<SkipNextIcon />}
          >
            Skip
          </Button>
          <Button
            className="table-iteration-button restart_button"
            onClick={reset}
            startIcon={<RestartAltIcon fontSize="large" />}
          />
        </div>
        <div className="table-iteration-actions" style={{ marginTop: "16px" }}>
          <Button
            className="table-iteration-button"
            onClick={handleUndoClick}
            disabled={undoStack.length === 0}
            style={{ backgroundColor: "orange", color: "white" }}
          >
            Undo
          </Button>
          <Button
            className="table-iteration-button"
            onClick={addNewScreenshot}
            startIcon={<ScreenshotIcon />}
            style={{ backgroundColor: "lightcoral", color: "white" }}
          >
            New Screenshot
          </Button>
        </div>
      </div>
    </>
  );
};

export default TableIteration;