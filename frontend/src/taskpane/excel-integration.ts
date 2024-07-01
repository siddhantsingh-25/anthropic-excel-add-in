// <reference path="office.d.ts"/>
// ExcelIntegration.ts
const ExcelIntegration = {
  async insertData(cellRef: string, data: any) {
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getRange(cellRef);
        range.values = [[data.ProductName]]; // Simplified for this example; adjust as needed
        await context.sync();
      });
    } catch (error) {
      console.error("Error inserting data into Excel", error);
      throw error;
    }
  },
};


export { ExcelIntegration };
