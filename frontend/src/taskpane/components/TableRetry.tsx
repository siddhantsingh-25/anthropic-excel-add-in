import React, { useState, useCallback, useEffect } from "react";
import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import axios from "axios";
import { Button, Spinner } from "@fluentui/react-components";
import TableIteration from "./TableIteration";
import "../styles/TableRetry.css";
import ReactDOM from 'react-dom';

interface TableRetryProps {
  initialJsonData: {
    detectedType: string;
    data: {
      ColumnData?: { [key: string]: string };
      RowData: { [key: string]: string | number }[];
    };
  };
  onReset: () => void;
  messagesContext: { [key: string]: any }[];
  imageSrc: string;
}

const TableRetry: React.FC<TableRetryProps> = ({ initialJsonData, onReset, messagesContext, imageSrc }) => {
  const [jsonData, setJsonData] = useState(initialJsonData);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [message, setMessage] = useState<string>(""); // retryMessage from the user
  const [finalizeCustomization, setFinalizeCustomization] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ [key: string]: any }[]>(messagesContext); // The messages array from the api.
  let rowData, columnDefs;
  const [updatedRowData, setUpdatedRowData] = useState<{ [key: string]: string | number }[]>([]);
  const [showIterationScreen, setShowIterationScreen] = useState(false);

  useEffect(() => {
    setUpdatedRowData(rowData);
  }, [rowData]);

  const handleConfirmTable = () => {
    setShowIterationScreen(true);
  };

  const handleMessageSubmit = useCallback(async () => {
    if (retryCount < 5 && message.trim() !== "") {
      try {
        setIsSendingMessage(true);
        setMessage("");
        const response = await axios.post(
          "https://api.quickdata.ai/retry",
          { retryMessage: message, messages: messages },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 200) {
          const newJsonData = JSON.parse(response.data.text);
          const updatedMessages = response.data.messages;
          setMessages(updatedMessages);
          setJsonData(newJsonData);
          console.log("RetryApi: RowData: ", newJsonData.data.RowData);
          console.log("RetryApi: ColumnData: ", generateColumnDefs(newJsonData));
          setRetryCount((prevCount) => prevCount + 1);
        } else {
          console.error(`Error: Retry API error: ${response.status} ${response}`);
        }
      } catch (error) {
        console.error("Error: retry message to the backend", error);
      } finally {
        setIsSendingMessage(false);
      }
    }
  }, [retryCount, message]);

  const ActionCellRenderer = (props: any) => {
    const { onAddRow, onRemoveRow, rowIndex } = props;
  
    return (
      <div>
        <button onClick={() => onAddRow(rowIndex)}>+</button>
        <button onClick={() => onRemoveRow(rowIndex)}>-</button>
      </div>
    );
  };
  

  const addRow = (rowIndex: number) => {
    const newRow = {};
    columnDefs.forEach((colDef) => {
      if (colDef.field !== "actions") {
        newRow[colDef.field] = "";
      }
    });
    const updatedData = [...updatedRowData];
    updatedData.splice(rowIndex + 1, 0, newRow);
    setUpdatedRowData(updatedData);
  
    // If the full-screen window is open, update its content as well
    if ((window as any).openedWindow && !(window as any).openedWindow.closed) {
      updateFullScreenWindow(updatedData);
    }
  };
  
  const removeRow = (rowIndex: number) => {
    if (updatedRowData.length > rowIndex) {
    const updatedData = [...updatedRowData];
    updatedData.splice(rowIndex, 1);
    setUpdatedRowData(updatedData);
  }
  
    // If the full-screen window is open, update its content as well
    if ((window as any).openedWindow && !(window as any).openedWindow.closed) {
      const updatedData = [...updatedRowData];
      updateFullScreenWindow(updatedData);
    }
  };
  
  const updateFullScreenWindow = (updatedData: { [key: string]: string | number }[]) => {
    if ((window as any).openedWindow && !(window as any).openedWindow.closed) {
      const gridDiv = (window as any).openedWindow.document.querySelector('.table-retry-grid');
  
      ReactDOM.render(
        <AgGridReact
          columnDefs={columnDefs}
          rowData={updatedData} // Use the updatedData passed to the function
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 150,
            editable: true,
          }}
          domLayout="autoHeight"
          onCellValueChanged={(params) => {
            const newData = updatedData.map((row, index) => {
              if (index === params.rowIndex) {
                return {
                  ...row,
                  [params.colDef.field]: params.newValue,
                };
              }
              return row;
            });
            setUpdatedRowData(newData);
            updateFullScreenWindow(newData); // Update full-screen window on cell change
          }}
          onCellEditingStopped={() => {
            if ((window as any).openedWindow && !(window as any).openedWindow.closed) {
              (window as any).openedWindow.focus();
            }
          }}
          components={{
            actionCellRenderer: ActionCellRenderer,
          }}
        />,
        gridDiv
      );
    }
  };
  
  

  const generateColumnDefs = (jsonData: any) => {
    if (jsonData.detectedType !== "tabular") {
      return [
        {
          field: "actions",
          headerName: "",
          width: 80,
          cellRenderer: "actionCellRenderer",
          cellRendererParams: {
            onAddRow: (rowIndex: number) => addRow(rowIndex),
            onRemoveRow: (rowIndex: number) => removeRow(rowIndex),
          },
        },
        {
          field: "Key",
          headerName: "Key",
        },
        {
          field: "Value",
          headerName: "Value",
        },
      ];
    } else {
      const { ColumnData } = jsonData.data;
      return [
        {
          field: "actions",
          headerName: "",
          width: 80,
          cellRenderer: "actionCellRenderer",
          cellRendererParams: {
            onAddRow: (rowIndex: number) => addRow(rowIndex),
            onRemoveRow: (rowIndex: number) => removeRow(rowIndex),
          },
        },
        ...Object.keys(ColumnData!).map((key) => ({
          field: key,
          headerName: key,
        })),
      ];
    }
  };
  
  rowData = jsonData.data.RowData.map((row) => {
    const updatedRow = { ...row };
    Object.keys(updatedRow).forEach((key) => {
      if (updatedRow[key] === undefined) {
        updatedRow[key] = 0;
      }
    });
    return updatedRow;
  });
  columnDefs = generateColumnDefs(jsonData);
  

  rowData = jsonData.data.RowData;
  columnDefs = generateColumnDefs(jsonData);

  if (finalizeCustomization) {
    const finalJsonData = {
      detectedType: jsonData.detectedType,
      data: {
        ColumnData: jsonData.data.ColumnData,
        RowData: rowData,
      },
    };
    return <TableIteration jsonData={finalJsonData} onReset={onReset} />;
  }

  const handleConfirmTableInFullScreen = () => {
    setShowIterationScreen(true);
    if ((window as any).openedWindow && !(window as any).openedWindow.closed) {
      (window as any).openedWindow.close();
    }
  };

  const handleFullScreen = () => {
    if ((window as any).openedWindow && !(window as any).openedWindow.closed) {
      (window as any).openedWindow.focus();
      return;
    }
  
    const newWindow = window.open('', '_blank');
    (window as any).openedWindow = newWindow;
  
    if (newWindow) {
      const styles = Array.from(document.styleSheets)
        .map((styleSheet: CSSStyleSheet) => {
          if (styleSheet.href) {
            return `<link href="${styleSheet.href}" rel="stylesheet"/>`;
          } else {
            return Array.from(styleSheet.cssRules)
              .map((rule: CSSRule) => rule.cssText)
              .join('\n');
          }
        })
        .join('\n');
  
      newWindow.document.write('<html><head><title>Extracted Data</title>');
      newWindow.document.write('<style>' + styles + '</style>');
      newWindow.document.write(`
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .table-retry-grid-container {
            width: 100%;
            max-width: 800px;
            margin-bottom: 20px;
          }
          img {
            max-width: 100%;
            height: auto;
            margin-top: 20px;
          }
        </style>
      `);
      newWindow.document.write('</head><body>');
  
      const tableHeader = newWindow.document.createElement('h2');
      tableHeader.textContent = 'Extracted Data Table';
      tableHeader.style.textAlign = 'center';
      tableHeader.style.color = '#333';
      tableHeader.style.fontFamily = 'Arial, sans-serif';
      newWindow.document.body.appendChild(tableHeader);
  
      const instruction = newWindow.document.createElement('p');
      instruction.textContent = 'Double click a cell to edit';
      instruction.style.textAlign = 'center';
      instruction.style.color = '#666';
      instruction.style.fontFamily = 'Arial, sans-serif';
      newWindow.document.body.appendChild(instruction);
  
      const container = newWindow.document.createElement('div');
      container.className = 'table-retry-grid-container';
  
      const gridDiv = newWindow.document.createElement('div');
      gridDiv.className = 'ag-theme-alpine table-retry-grid';
      container.appendChild(gridDiv);
  
      newWindow.document.body.appendChild(container);
  
      const separator = newWindow.document.createElement('hr');
      newWindow.document.body.appendChild(separator);
  
      const imageHeader = newWindow.document.createElement('h2');
      imageHeader.textContent = 'Original Image';
      imageHeader.style.textAlign = 'center';
      imageHeader.style.color = '#333';
      imageHeader.style.fontFamily = 'Arial, sans-serif';
      newWindow.document.body.appendChild(imageHeader);
  
      const imageElement = newWindow.document.createElement('img');
      imageElement.src = imageSrc;
      imageElement.alt = 'Original Image';
      newWindow.document.body.appendChild(imageElement);
  
      const confirmButton = newWindow.document.createElement('button');
      confirmButton.textContent = 'Looks Good!';
      confirmButton.style.backgroundColor = 'blue';
      confirmButton.style.color = 'white';
      confirmButton.style.border = 'none';
      confirmButton.style.padding = '10px 20px';
      confirmButton.style.marginTop = '20px';
      confirmButton.style.cursor = 'pointer';
      confirmButton.style.fontFamily = 'Arial, sans-serif';
      confirmButton.addEventListener('click', handleConfirmTableInFullScreen);
  
      newWindow.document.body.appendChild(confirmButton);
  
      newWindow.document.write('</body></html>');
      newWindow.document.close();
  
      // Initial render of the grid with the current data
      updateFullScreenWindow(updatedRowData);
    }
  };
  

  useEffect(() => {
    if (updatedRowData.length > 0) {
      handleFullScreen();
    }

    if (showIterationScreen && (window as any).openedWindow && !(window as any).openedWindow.closed) {
      (window as any).openedWindow.close();
    }
  }, [updatedRowData, showIterationScreen]);

  if (showIterationScreen) {
    const finalJsonData = {
      detectedType: jsonData.detectedType,
      data: {
        ColumnData: jsonData.data.ColumnData,
        RowData: updatedRowData,
      },
    };
    return <TableIteration jsonData={finalJsonData} onReset={onReset} />;
  }
  
  return (
    <div className="table-retry-container" style={{ padding: '10px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <h2 className="table-retry-title" style={{ marginLeft: '10px' }}>Extracted Data</h2>
      <h4 className="instructions" style={{ fontWeight: 'normal', textAlign: 'center', margin: '0 10px' }}>
        Use the pop-up window to edit the information extracted from the image. Your original image is included as a reference to compare to the OCR extraction. Double click a cell to edit.
      </h4>
      <div className="table-retry-grid-container" style={{ visibility: 'hidden', height: 0 }}>
        <div className="ag-theme-alpine table-retry-grid" style={{ marginLeft: '10px' }}>
          <AgGridReact
            columnDefs={columnDefs}
            rowData={updatedRowData}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
              editable: true,
            }}
            domLayout="autoHeight"
            onGridReady={(params) => {
              params.api.sizeColumnsToFit();
            }}
            onCellValueChanged={(params) => {
              const updatedData = [...updatedRowData];
              updatedData[params.rowIndex] = {
                ...updatedData[params.rowIndex],
                [params.colDef.field]: params.newValue,
              };
              setUpdatedRowData(updatedData);
            }}
          />
        </div>
      </div>
      <div className="table-retry-actions" style={{ marginLeft: '10px' }}>
        <Button
          className="table-retry-button"
          appearance="secondary"
          onClick={handleFullScreen}
          style={{ backgroundColor: 'lightblue', color: 'white' }}
        >
          Full Screen
        </Button>
        <div style={{ paddingTop: '30px' }}>
          <Button
            className="table-retry-button"
            appearance="secondary"
            onClick={onReset}
            style={{ backgroundColor: 'lightcoral', color: 'white' }}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
  
};

export default TableRetry;


//Check width changes to be working