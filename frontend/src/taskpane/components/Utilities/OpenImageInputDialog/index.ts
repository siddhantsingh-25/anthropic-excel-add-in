import { JsonData } from "../../Types";
import constants from "../../../../Constants";

const url: string = `${constants.DOMAIN_URL}/Index.html`;
let tableDialog: any; // Adjust the type if necessary

export async function OpenTableDialog(
  jsonData: JsonData,
  TableIteration: string,
  column: number,
  row: number,
  imageSrc: string
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    Office.context.ui.displayDialogAsync(
      `${url}?state=${encodeURIComponent(TableIteration)}&column=${encodeURIComponent(row)}&row=${encodeURIComponent(
        column
      )}`,
      { height: 90, width: 70 },
      function (result: any) {
        if (result.error) {
          console.log("error opening dialog", result);
          reject(result.error);
          return;
        }
        const messageToDialog = JSON.stringify({
          name: "My Data",
          value: 123,
        });

        tableDialog = result.value;
        tableDialog.messageChild(messageToDialog);

        if (!tableDialog) {
          console.log("promptDialog field empty (value)", result);
          reject(new Error("Dialog is not available"));
          return;
        }

        tableDialog.addEventHandler(Office.EventType.DialogMessageReceived, async function (arg: any) {
          try {
            let status = await processMessage(arg);
            if (status === "passed") {
              tableDialog.messageChild(JSON.stringify({ jsonData: jsonData, imageSrc: imageSrc }));
            } else {
              tableDialog.close();
              resolve(arg.message); // Resolve the promise indicating success
            }
          } catch (error) {
            reject(error); // Reject the promise if an error occurs
          }
        });

        tableDialog.messageChild({ type: "props", payload: "test" });
      }
    );
  });
}

async function processMessage(arg: any): Promise<string> {
  const response: any = JSON.parse(arg.message);

  if (response.message === "IAmReady") {
    return "passed";
  } else {
    return "close";
  }
}
