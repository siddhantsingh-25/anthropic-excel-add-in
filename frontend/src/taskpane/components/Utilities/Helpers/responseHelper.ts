// data.js

 let jsonHelperData = {
  image: "",
  tabledata: [],
};

export const setImage = (imageUrl) => {
  jsonHelperData = { ...jsonHelperData, image: imageUrl };
};

export const setTableData = (data) => {
  jsonHelperData = { ...jsonHelperData, tabledata: data };
};

export const getImage = () => {
  return jsonHelperData.image;
};

export const getTableData = () => {
  return jsonHelperData.tabledata;
};
