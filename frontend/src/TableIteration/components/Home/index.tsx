import * as React from "react";
import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import "./index.css";
import { JsonData } from "../../../taskpane/components/Types";
import {
  GridRowModes,
  DataGrid,
  GridToolbarContainer,
  GridActionsCellItem,
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
  imageSrc: string;
}

const Home: React.FC<Props> = ({ jsonData, imageSrc }) => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rowModesModel, setRowModesModel] = useState({});
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);

  useEffect(() => {
    try {
      const isTabular = Array.isArray(jsonData.data.RowData) && jsonData.data.ColumnData;

      if (isTabular) {
        setRows(jsonData.data.RowData);
        setColumns(Object.keys(jsonData.data.ColumnData || {}));
      } else {
        // Transform non-tabular data to tabular format
        const nonTabularData = jsonData.data.RowData;
        const transformedRows = nonTabularData.map((item, index) => ({
          id: index,
          Key: item.Key,
          Value: item.Value,
        }));
        setRows(transformedRows);
        setColumns(["Key", "Value"]);
      }

      console.log("Rows data in table", jsonData.data.RowData);
      console.log("Columns data in table", jsonData.data.ColumnData);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }, [jsonData]);

  const handleRowEditStop = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
      const row = rows.find((row) => row.id === params.id);
      processRowUpdate(row);
    }
  };

  const handleAddClick = (id) => {
    const newRowId = Date.now();
    const newRow = {
      id: newRowId,
      ...columns.reduce((acc, key) => {
        acc[key] = "";
        return acc;
      }, {}),
    };
    const selectedRowIndex = rows.findIndex((row) => row.id === id);
    let insertIndex = selectedRowIndex + 1;
    if (selectedRowIndex === rows.length - 1) {
      insertIndex = rows.length;
    }
    const updatedRows = [...rows.slice(0, insertIndex), newRow, ...rows.slice(insertIndex)];
    setRows(updatedRows);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [newRowId]: { mode: GridRowModes.Edit, fieldToFocus: "First Name" },
    }));
    console.log("Added new row. Updated table data:", newRow);
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    console.log("Saved row. Updated table data:", rows);
  };

  const handleDeleteClick = (id) => () => {
    const updatedRows = rows.filter((row) => row.id !== id);
    setRows(updatedRows);
    console.log("Deleted row. Updated table data:", updatedRows);
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

  const handleLooksGoodClick = () => {
    console.log("Final table data:", rows);
    jsonData.data.RowData = rows;

    if (Array.isArray(jsonData.data.RowData) && jsonData.data.ColumnData) {
      jsonData.data.ColumnData = columns.reduce((acc, col) => {
        acc[col] = jsonData.data.ColumnData[col] || "";
        return acc;
      }, {});
    } else {
      jsonData.data.ColumnData = columns.reduce((acc, col) => {
        acc[col] = "";
        return acc;
      }, {});
    }

    Office.context.ui.messageParent(JSON.stringify(jsonData));
    console.log("Final data to transfer", jsonData);
  };

  const handleAddColumn = (index) => {
    const newColumn = "New Column";
    const updatedColumns = [...columns.slice(0, index), newColumn, ...columns.slice(index)];
    setColumns(updatedColumns);
    const updatedRows = rows.map((row) => {
      const newRow = {};
      Object.keys(row).forEach((key, idx) => {
        newRow[key] = row[key];
        if (idx === index - 1) {
          newRow[newColumn] = "";
        }
      });
      return newRow;
    });
    setRows(updatedRows);
    console.log("Added new column at specified index. Updated table data:", updatedColumns, updatedRows);
  };

  const handleDeleteColumn = (column) => {
    const updatedColumns = columns.filter((col) => col !== column);
    setColumns(updatedColumns);
    const updatedRows = rows.map((row) => {
      const { [column]: _, ...rest } = row;
      return rest;
    });
    setRows(updatedRows);
    console.log("Deleted column. Updated table data:", updatedColumns, updatedRows);
  };

  const generateColumns = (): GridColDef[] => {
    const dynamicColumns = columns.map((column, index) => ({
      field: column,
      headerName: column,
      width: 250,
      editable: true,
      renderHeader: () => (
        <div
          style={{
            display: "flex",
            gap: "4px",
            alignItems: "center",
            fontSize: "15px",
          }}
        >
          <AddIcon style={{ cursor: "pointer", fontSize: "larger" }} onClick={() => handleAddColumn(index + 1)} />
          <DeleteIcon style={{ cursor: "pointer", fontSize: "larger" }} onClick={() => handleDeleteColumn(column)} />
          {column}
        </div>
      ),
    }));

    return [
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 100,
        cellClassName: "actions",
        getActions: ({ id }) => {
          const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

          if (isInEditMode) {
            return [
              <GridActionsCellItem
                icon={<SaveIcon />}
                label="Save"
                sx={{ color: "primary.main" }}
                onClick={handleSaveClick(id)}
                key={id}
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                onClick={handleDeleteClick(id)}
                key={id}
                label="Cancel"
                className="textPrimary"
                color="inherit"
              />,
            ];
          }

          return [
            <GridActionsCellItem
              icon={<AddIcon />}
              label="Add"
              key={id}
              className="textPrimary"
              onClick={() => handleAddClick(id)}
              color="inherit"
            />,
            <GridActionsCellItem
              icon={<DeleteIcon />}
              label="Delete"
              key={id}
              onClick={handleDeleteClick(id)}
              color="inherit"
            />,
          ];
        },
      },
      ...dynamicColumns,
    ];
  };

  return (
    <>
      <h1
        style={{
          textAlign: "center",
        }}
      >
        Extracted Table
      </h1>
      <div
        style={{
          padding: "20px",
        }}
        onClick={() => setIsImageOpen(false)}
      >
        <Box
          sx={{
            height: "58vh",
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
            columns={generateColumns()}
            editMode="row"
            rowModesModel={rowModesModel}
            onRowModesModelChange={handleRowModesModelChange}
            onRowEditStop={handleRowEditStop}
            processRowUpdate={processRowUpdate}
            paginationMode="client"
            slots={{ toolbar: EditToolbar }}
            slotProps={{ toolbar: { setRows, setRowModesModel } }}
          />
        </Box>
        <div
          style={{
            position: "fixed",
            bottom: "66px",
            left: "37%",
          }}
        >
          <img
            src={imageSrc}
            alt="table"
            width={200}
            height={130}
            className="thumbnail"
            onMouseEnter={() => {
              setIsImageOpen(true);
              setIsHoveringImage(true);
            }}
            onMouseLeave={() => setIsHoveringImage(false)}
          />
        </div>


        {isImageOpen && (
          <div
            style={{
              position: "fixed",
              top: "5%",
              left: "5%",
              height: "85%",
              width: "90%",
              backgroundColor: "transparent",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 999,
            }}
            onMouseLeave={() => {
              if (!isHoveringImage) setIsImageOpen(false);
            }}
            onClick={() => setIsImageOpen(false)}
          >
            <img
              src={imageSrc}
              alt="table"
              className="fullsize"
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => setIsHoveringImage(false)}
            />
          </div>
        )}

        <div
          style={{
            position: "fixed",
            right: "35px",
            bottom: "20px",
          }}
        >
          <Button variant="contained" onClick={handleLooksGoodClick}>
            Looks Good
          </Button>
        </div>
      </div>
    </>
  );
};

export default Home;
