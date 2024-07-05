interface ColumnData {
  [key: string]: string;
}

export interface RowData {
  id: number;
  [key: string]: string | number;
}

export interface JsonData {
  // Export the JsonData interface
  detectedType: string;
  data: {
    ColumnData?: ColumnData;
    RowData: RowData[];
  };
}
export interface Message {
  [key: string]: any;
}

export interface childDataToParent {
  // Export the JsonData interface
  jsonData: JsonData;
  imageSrc: string;

}
