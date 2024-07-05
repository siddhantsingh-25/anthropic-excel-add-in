import * as React from "react";
import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import "./index.css";
import { JsonData } from "../../../taskpane/components/Types";
import {
  GridRowModes,
  DataGrid,
  GridToolbarContainer,
  GridRowEditStopReasons,
  GridColDef,
  GridRowId,
} from "@mui/x-data-grid";

function EditToolbar(props) {
  const { setRows, setRowModesModel } = props;
  return <GridToolbarContainer></GridToolbarContainer>;
}

interface Props {
  jsonData: JsonData;
  column: number;
  row: number;
}

const ValidateResponse: React.FC<Props> = ({ jsonData, column, row }) => {
  // State for rows with IDs
  const [rows, setRows] = useState([]);
  const [columnIndex, setColumnIndex] = useState(column);
  const [rowIndex, setRowIndex] = useState(row);
  const [rowModesModel, setRowModesModel] = useState({});

  useEffect(() => {
    try {
      setRows(jsonData.data.RowData);
      console.log("Extracted data from Table", jsonData.data.RowData);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }, []);

  const handleRowEditStop = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const processRowUpdate = (newRow) => {
    const updatedRow = { ...newRow, isNew: false };
    const updatedRows = rows.map((row) => (row.id === newRow.id ? updatedRow : row));
    setRows(updatedRows);
    console.log("Row updated. Updated table data:", updatedRows);
    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const CloseDialog = () => {
    Office.context.ui.messageParent(JSON.stringify({ message: "fullScreen" }));
  };
  const TableIteration = (): GridColDef[] => {
    const dynamicColumns = Object.keys(jsonData.data.ColumnData || {}).map((column, index) => ({
      field: column,
      headerName: column,
      width: 200,
      renderCell: (params) => {
        const isTargetCell = rows.findIndex((row) => row.id === params.id) === rowIndex && index === columnIndex;
        const style = isTargetCell ? { backgroundColor: "yellow" } : {};
        return <div style={style}>{params.value}</div>;
      },
    }));
    return [...dynamicColumns];
  };
  return (
    <>
      <h1
        style={{
          textAlign: "center",
        }}
      >
        Extracted Data Table
      </h1>
      <div
        style={{
          padding: "25px",
        }}
      >
        <Box
          sx={{
            height: "80vh",
            width: "100%",
            "& .actions": {
              color: "text.secondary",
            },
            "& .textPrimary": {
              color: "text.primary",
            },
          }}
        >
          <DataGrid
            rows={rows}
            columns={TableIteration()}
            rowModesModel={rowModesModel}
            onRowModesModelChange={handleRowModesModelChange}
            onRowEditStop={handleRowEditStop}
            processRowUpdate={processRowUpdate}
            paginationMode="client"
            slots={{ toolbar: EditToolbar }}
            slotProps={{ toolbar: { setRows, setRowModesModel } }}
          />
        </Box>
      </div>

      <div
        style={{
          position: "fixed",
          right: "35px",
          bottom: "20px",
        }}
      >
        <Button variant="contained" onClick={CloseDialog}>
          Close
        </Button>
      </div>
    </>
  );
};

export default ValidateResponse;
