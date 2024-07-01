import React, { useState, useCallback, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Button } from "@fluentui/react-components";
import "../styles/TableIteration.css";
import ReactDOM from 'react-dom';

interface TableIterationProps {
  jsonData: {
    detectedType: string;
    data: {
      ColumnData?: { [key: string]: string };
      RowData: { [key: string]: string | number }[];
    };
  };
  onReset: () => void;
}

let targetCell: Excel.Range | null = null;

const writeToExcelMock = async (data: any, cell: string) => {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getRange(cell);
      console.log("Cell input: ", cell);
      console.log("Cell data: ", data);
      range.load("values");
      await context.sync();

      const existingValue = range.values[0][0];
      let newValue;

      if (typeof existingValue === "number" && typeof data === "number") {
        newValue = existingValue + data;
      } else {
        newValue = data;
      }

      range.values = [[newValue]];
      await context.sync();
      console.log(`Writing "${newValue}" to Excel cell ${cell}`);
    });
  } catch (error) {
    console.error(`Error writing to Excel: ${error}`);
  }
};

const handleSelectionChange = async (event: Excel.WorksheetSingleClickedEventArgs) => {
  await Excel.run(async (context) => {
    console.log("onSingleClicked triggered");
    const worksheet = context.workbook.worksheets.getItem(event.worksheetId);
    const range = worksheet.getRange(event.address);
    range.load("address");
    await context.sync();
    targetCell = range;
  });
};

Excel.run(async (context) => {
  const workbook = context.workbook;
  workbook.worksheets.load("items");
  await context.sync();

  workbook.worksheets.items.forEach((worksheet) => {
    worksheet.onSingleClicked.add(handleSelectionChange);
  });
  await context.sync();
});

const TableIteration = ({ jsonData, onReset }) => {
  const [isIterating, setIsIterating] = useState(false);
  const [currentCell, setCurrentCell] = useState(null);
  const [rowData, setRowData] = useState(jsonData.data.RowData);
  const [fullScreenWindow, setFullScreenWindow] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const gridApiRef = useRef(null);
  const iterationRef = useRef(null);
  const savedStateRef = useRef(null);

  const getCellClassRules = useCallback(() => {
    return {
      "table-iteration-current-cell": (params) =>
        currentCell &&
        params.node.rowIndex === currentCell.row &&
        params.colDef.field === columnDefs[currentCell.col].field,
    };
  }, [currentCell]);

  const generateColumnDefs = (jsonData) => {
    const { ColumnData } = jsonData.data;
  
    if (jsonData.detectedType !== "tabular") {
      return [
        {
          field: "Key",
          headerName: "Key",
          cellClassRules: getCellClassRules(),
        },
        {
          field: "Value",
          headerName: "Value",
          cellClassRules: getCellClassRules(),
        },
      ];
    } else {
      return Object.keys(ColumnData).map((key) => ({
        field: key,
        headerName: key,
        cellClassRules: getCellClassRules(),
      }));
    }
  };
  
  const columnDefs = generateColumnDefs(jsonData);

  const startIteration = useCallback(() => {
    setIsIterating(true);
    setCurrentCell(savedStateRef.current || { row: 0, col: 0 });
  }, []);

  const endIteration = useCallback(() => {
    setIsIterating(false);
    if (iterationRef.current) {
      clearTimeout(iterationRef.current);
      iterationRef.current = null;
    }
  }, []);

  const handleSkipButtonClick = useCallback(() => {
    if (currentCell) {
      const { row, col } = currentCell;
      if (col < Object.keys(rowData[0]).length - 1) {
        setCurrentCell({ row, col: col + 1 });
      } else if (row < rowData.length - 1) {
        setCurrentCell({ row: row + 1, col: 0 });
      }
    }
  }, [currentCell, rowData]);

  const handleUndoButtonClick = useCallback(() => {
    if (currentCell) {
      const { row, col } = currentCell;
      if (col > 0) {
        setCurrentCell({ row, col: col - 1 });
      } else if (row > 0) {
        setCurrentCell({ row: row - 1, col: Object.keys(rowData[0]).length - 1 });
      }
    }
  }, [currentCell, rowData]);

  const iterateCells = useCallback(async () => {
    if (isIterating && currentCell) {
      const { row, col } = currentCell;
  
      if (row < rowData.length) {
        const field = Object.keys(rowData[row])[col];
        const data = rowData[row][field];
  
        await new Promise<void>((resolve) => {
          const checkTargetCell = () => {
            if (targetCell) {
              writeToExcelMock(data, targetCell.address);
              setCurrentCell({ row, col: null });  // Temporarily set currentCell to null to force re-render
              setCurrentCell({ row, col }); // Set the new currentCell
              targetCell = null;
              resolve();
            } else {
              iterationRef.current = setTimeout(checkTargetCell, 100);
            }
          };
          checkTargetCell();
        });
  
        gridApiRef.current?.refreshCells({ force: true });
  
        if (col < Object.keys(rowData[0]).length - 1) {
          setCurrentCell({ row, col: col + 1 });
        } else if (row < rowData.length - 1) {
          setCurrentCell({ row: row + 1, col: 0 });
        } else {
          setIsIterating(false);
        }
      } else {
        setIsIterating(false);
      }
    }
  }, [rowData, isIterating, currentCell]);




  
  useEffect(() => {
    if (isIterating) {
      if (iterationRef.current) {
        clearTimeout(iterationRef.current);
        iterationRef.current = null;
      }
      iterateCells();
    }
  }, [isIterating, iterateCells]);

  useEffect(() => {
    if (currentCell && gridApiRef.current) {
      setTimeout(() => {
        gridApiRef.current.ensureIndexVisible(currentCell.row, 'middle');
        gridApiRef.current.ensureColumnVisible(columnDefs[currentCell.col].field, 'middle');
      }, 0);
    }
  }, [currentCell, columnDefs]);

  useEffect(() => {
    if (fullScreenWindow && fullScreenWindow.gridApi) {
      fullScreenWindow.gridApi.refreshCells({ force: true });
      if (currentCell) {
        fullScreenWindow.gridApi.flashCells({
          rowNodes: [fullScreenWindow.gridApi.getRowNode(String(currentCell.row))],
          columns: [fullScreenWindow.columnApi.getColumn(columnDefs[currentCell.col].field)],
        });
      }
    }
  }, [currentCell, fullScreenWindow, columnDefs]);

  const handleFullScreen = () => {
    if (fullScreenWindow && !fullScreenWindow.closed) {
      fullScreenWindow.focus();
      return;
    }
  
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      const styles = Array.from(document.styleSheets)
        .map((styleSheet: CSSStyleSheet) => {
          if (styleSheet.href) {
            return `<link href="${styleSheet.href}" rel="stylesheet"/>`;
          } else {
            return Array.from(styleSheet.cssRules)
              .map((rule: CSSRule) => rule.cssText)
              .join("\n");
          }
        })
        .join("\n");
  
      newWindow.document.write("<html><head><title>Iteration</title>");
      newWindow.document.write("<style>" + styles + "</style>");
      newWindow.document.write("</head><body>");
  
      const container = newWindow.document.createElement("div");
      container.className = "table-iteration-grid-container";
  
      const gridDiv = newWindow.document.createElement("div");
      gridDiv.className = "ag-theme-alpine table-iteration-grid";
      container.appendChild(gridDiv);
  
      const fullScreenWindowRef = {
        window: newWindow,
        gridApi: null,
        columnApi: null,
      };
  
      ReactDOM.render(
        <AgGridReact
          // Inside the onGridReady event handler of AgGridReact component
          onGridReady={(params) => {
            fullScreenWindowRef.gridApi = params.api;
            fullScreenWindowRef.columnApi = params.columnApi;
            setFullScreenWindow(fullScreenWindowRef.window);
            if (currentCell) {
              params.api.flashCells({
                rowNodes: [params.api.getRowNode(String(currentCell.row))],
                columns: [params.columnApi.getColumn(columnDefs[currentCell.col].field)],
              });
              // Highlight the current cell initially
              setCurrentCell({ row: currentCell.row, col: currentCell.col });
            }
          }}
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 150,
          }}
          domLayout="autoHeight"
          onCellValueChanged={(params) => {
            const updatedData = [...rowData];
            updatedData[params.rowIndex] = {
              ...updatedData[params.rowIndex],
              [params.colDef.field]: params.newValue,
            };
            setRowData(updatedData);
          }}
        />,
        gridDiv
      );
  
      newWindow.document.body.appendChild(container);
      newWindow.document.write("</body></html>");
      newWindow.document.close();
    }
  };
  
  

  useEffect(() => {
    startIteration();
  }, [startIteration]);

  const pauseIteration = useCallback(() => {
    if (isIterating) {
      savedStateRef.current = currentCell;
      setIsPaused(true);
      endIteration();
    }
  }, [isIterating, currentCell, endIteration]);

  const resumeIteration = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startIteration();
    }
  }, [isPaused, startIteration]);

  const handlePausePlayClick = () => {
    if (isPaused) {
      resumeIteration();
    } else {
      pauseIteration();
    }
  };
  

  const restartIteration = useCallback(() => {
    setIsIterating(false);
    setIsPaused(false);
    savedStateRef.current = null;
    setCurrentCell({ row: 0, col: 0 });
    startIteration();
  }, [startIteration]);
  

  return (
    <div className="table-iteration-container">
      <h2 className="table-iteration-title" style={{ textAlign: 'center' }}>Iteration</h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ marginBottom: '8px' }}>Current</h3>
        {currentCell && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #ccc',
              padding: '8px',
              width: '200px',
              height: '80px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                marginBottom: '8px',
                backgroundColor: 'lightblue',
                color: 'white',
                padding: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {columnDefs[currentCell.col].headerName}
            </div>
            <div
              style={{
                fontSize: '16px',
                backgroundColor: 'yellow',
                padding: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {rowData[currentCell.row][columnDefs[currentCell.col].field]}
            </div>
          </div>
        )}
        <h3 style={{ marginBottom: '8px' }}>Next</h3>
        {currentCell && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #ccc',
              padding: '8px',
              width: '200px',
              height: '80px',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {currentCell.col < columnDefs.length - 1
                ? columnDefs[currentCell.col + 1].headerName
                : columnDefs[0].headerName}
            </div>
            <div
              style={{
                fontSize: '16px',
                padding: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {currentCell.col < columnDefs.length - 1
                ? rowData[currentCell.row][columnDefs[currentCell.col + 1].field]
                : rowData[currentCell.row + 1]
                  ? rowData[currentCell.row + 1][columnDefs[0].field]
                  : ''}
            </div>
          </div>
        )}
      </div>
      <div className="table-iteration-actions" style={{ paddingBottom: '10px' }}>
        <Button
          className="table-iteration-button"
          appearance="primary"
          onClick={handlePausePlayClick}
          style={{ backgroundColor: 'green', color: 'white' }}
        >
          {isPaused ? "Play" : "Pause"}
        </Button>
        
        <Button
          className="table-iteration-button"
          appearance="primary"
          onClick={handleFullScreen}
          style={{ backgroundColor: 'blue', color: 'white' }}
        >
          Full Screen
        </Button>
      </div>
      <div className="table-iteration-actions">
      <Button
        className="table-iteration-button"
        appearance="primary"
        onClick={restartIteration}
        style={{ backgroundColor: 'orange', color: 'white' }}
      >
        Restart Iteration
        <i className="fa fa-refresh"></i>
      </Button>
        <Button
          className="table-iteration-button"
          appearance="primary"
          onClick={handleSkipButtonClick}
          style={{ backgroundColor: 'green', color: 'white' }}
        >
          Skip
        </Button>
        <Button
          className="table-iteration-button"
          appearance="primary"
          onClick={handleUndoButtonClick}
          style={{ backgroundColor: 'green', color: 'white' }}
        >
          Undo
        </Button>
      </div>
      <div className="table-iteration-actions" style={{ marginTop: '16px' }}>
        <Button
          className="table-iteration-button"
          appearance="primary"
          onClick={onReset}
          style={{ backgroundColor: 'lightcoral', color: 'white' }}
        >
          New Screenshot
        </Button>
      </div>
    </div>
  );
  
};

export default TableIteration;
