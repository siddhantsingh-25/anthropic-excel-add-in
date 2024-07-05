import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import ScreenshotIcon from "@mui/icons-material/Screenshot";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UndoIcon from "@mui/icons-material/Undo";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import PausePresentationIcon from "@mui/icons-material/PausePresentation";
import { OpenTableDialog } from "../../Utilities/OpenImageInputDialog";
import "../../Styles/TableIteration.css";

import { JsonData } from "../../Types";
import { writeToExcelMock } from "../../../office-document";
import { initializeExcelAddin } from "../../Utilities/Excel/BindCellEvent";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";

const TabularData = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { response } = (location.state || {}) as { response: string };
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [NotificationBar, setNotificationBar] = useState(false);
  const [cellAddress, setCellAddress] = useState("");
  const [showRowHeaders, setShowRowHeaders] = useState(true);
  const [undoStack, setUndoStack] = useState<
    { headerIndex: number; rowIndex: number; cellAddress: string; previousValue: string; newValue: string }[]
  >([]);
  const [fullScreenDialog, setFullScreenDialog] = useState(null);
  const [cellChanges, setCellChanges] = useState<{ [key: string]: string[] }>({});

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
    let nextHeaderIndex = currentHeaderIndex;
    let nextIndex = currentIndex;

    // Iterate until a non-empty cell is found
    while (true) {
      if (nextHeaderIndex < headers.length - 1) {
        nextHeaderIndex++;
      } else {
        if (nextIndex < data.length - 1) {
          nextIndex++;
          nextHeaderIndex = 0;
        } else {
          setNotificationBar(true);
          return;
        }
      }

      const nextCellValue = data[nextIndex][headers[nextHeaderIndex]];

      // Check if the row contains only blank cells (excluding the row header)
      const isRowBlank = headers.slice(1).every((header) => !data[nextIndex][header]);

      if (nextCellValue != null && nextCellValue !== "" && !isRowBlank) {
        break;
      }

      if (isRowBlank && nextHeaderIndex === 0) {
        nextHeaderIndex = headers.length - 1; // Skip to the next row if the current row is blank
      }
    }

    setCurrentHeaderIndex(nextHeaderIndex);
    setCurrentIndex(nextIndex);
    updateFullScreenView();
  };

  // Initial check for the first row during component mount
  useEffect(() => {
    const initialIsRowBlank = headers.slice(1).every((header) => !data[currentIndex][header]);

    if (initialIsRowBlank) {
      handleNextButtonClick();
    }
  }, []);

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
    let valueToWrite = currentRow[headers[currentHeaderIndex]];
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

      await writeToExcelMock(newValue, cellAddress);
      console.log("Excel write complete");
      handleNextButtonClick();
    } catch (error) {
      console.error("Excel write failed: ", error);
    }
};

  const handleUndoClick = async () => {
    const lastChangedCell = Object.keys(cellChanges).reverse().find(cell => cellChanges[cell].length > 0);
    
    if (lastChangedCell) {
      const previousValues = cellChanges[lastChangedCell];
      const valueToRestore = previousValues[previousValues.length - 1];
      
      try {
        await writeToExcelMock(valueToRestore, lastChangedCell);
        console.log("Undo successful");

        // Update cellChanges
        setCellChanges((prev) => ({
          ...prev,
          [lastChangedCell]: prev[lastChangedCell].slice(0, -1),
        }));

        // Find the corresponding header and row index
        const [col, row] = lastChangedCell.match(/[A-Z]+|[0-9]+/g);
        const headerIndex = headers.findIndex(header => header === col);
        const rowIndex = parseInt(row) - 1;

        setCurrentHeaderIndex(headerIndex);
        setCurrentIndex(rowIndex);
      } catch (error) {
        console.error("Undo failed: ", error);
      }
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

  useEffect(() => {
    return () => {
      if (fullScreenDialog) {
        fullScreenDialog.close();
      }
    };
  }, [fullScreenDialog]);

  

  return (
    <>
      <div className="table-iteration-container" style={{ overflowY: "auto", height: "calc(100vh - 50px)" }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <h3 style={{ marginBottom: "0" }}>Current</h3>
              <label style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  checked={showRowHeaders}
                  onChange={(e) => setShowRowHeaders(e.target.checked)}
                  color="primary"
                  style={{ marginRight: "5px" }}
                />
                Show row headers
              </label>
            </div>
            <div className={`CurrentBox ${showRowHeaders ? "with-row-header" : ""}`}>
              <div className="currentBoxHeader">{headers[currentHeaderIndex]}</div>
              {showRowHeaders && <div className="currentBoxRowHeader">{getRowHeader(currentIndex)}</div>}
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
              {showRowHeaders && <div className="NextBoxRowHeader">{getNextRowHeader()}</div>}
              <div className="NextBoxValue">{getNextCellValue()}</div>
            </div>
          </>
        )}
        <div className="iteration_buttons" style={{ marginTop: "20px" }}>
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
                disabled={Object.values(cellChanges).every(changes => changes.length === 0)}
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

export default TabularData;
