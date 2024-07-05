export async function initializeExcelAddin(setCellAddress: (cellAddress: string) => void) {
  await Excel.run(async (context) => {
    const workbook = context.workbook;
    workbook.worksheets.load("items");
    await context.sync();

    workbook.worksheets.items.forEach((worksheet) => {
      // Handle cell selection change
      worksheet.onSelectionChanged.add(async (event) => {
        console.log(event);
        try {
          // Use the event context for handling the cell selection change
          await Excel.run(async (eventContext) => {
            const range = eventContext.workbook.getSelectedRange();
            range.load("address");
            await eventContext.sync();

            setCellAddress(range.address);
          });
        } catch (error) {
          console.error(`Error handling selection change: ${error}`);
        }
      });

      // Handle single cell click
      worksheet.onSingleClicked.add(async (event) => {
        try {
          // Use the event context for handling the cell selection change
          await Excel.run(async (eventContext) => {
            setCellAddress(event.address); // Call handleSelectionChange with the cell address
            await eventContext.sync();
          });
        } catch (error) {
          console.error(`Error handling cell click: ${error}`);
        }
      });
    });

    await context.sync();
  });
}
