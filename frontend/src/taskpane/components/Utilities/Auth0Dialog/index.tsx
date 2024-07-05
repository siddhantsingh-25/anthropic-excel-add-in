import constants from "../../../../Constants";

const url: string = `${constants.DOMAIN_URL}/Auth.html`;
let tableDialog: any; // Adjust the type if necessary

export async function OpenAuthDialog(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    Office.context.ui.displayDialogAsync(`${url}`, { height: 90, width: 70 }, function (result: any) {
      if (result.error) {
        console.log("error opening dialog", result);
        reject(result.error);
        return;
      }

      tableDialog = result.value;

      if (!tableDialog) {
        console.log("promptDialog field empty (value)", result);
        reject(new Error("Dialog is not available"));
        return;
      }

      tableDialog.addEventHandler(Office.EventType.DialogMessageReceived, async function (arg: any) {
        try {
          let status = await processMessage(arg);
          tableDialog.close();
          resolve(arg.message); // Resolve the promise indicating success
        } catch (error) {
          reject(error); // Reject the promise if an error occurs
        }
      });
    });
  });
}

async function processMessage(arg: any): Promise<string> {
  const response: any = JSON.parse(arg.message);
  return "close";
}
