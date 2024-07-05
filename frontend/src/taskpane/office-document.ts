export const writeToExcelMock = (data, cell) => {
  return new Promise((resolve, reject) => {
    Excel.run(async (context) => {
      try {
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
          console.log(cell);
          console.log("existing value", existingValue);
          console.log("new value", newValue);
        } else {
          newValue = data;
          console.log(cell);
          console.log("existing value", existingValue);
          console.log("new value", newValue);
        }

        range.values = [[newValue]];
        await context.sync();
        console.log(`Writing "${newValue}" to Excel cell ${cell}`);
        resolve(`Successfully wrote "${newValue}" to Excel cell ${cell}`);
      } catch (error) {
        console.error(`Error writing to Excel: ${error}`);
        reject(`Error writing to Excel: ${error}`);
      }
    });
  });
};