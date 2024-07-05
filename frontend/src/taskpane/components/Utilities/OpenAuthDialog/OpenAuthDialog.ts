import constants from "../../../../Constants";
import { getToken, getUser } from "../Token";
import { getProductKey } from "../API Services";
//import { encryptData } from "../Encryption/cryptoUtils";

let messageDialog: any;

export async function openAuthDialog(): Promise<string> {
  const url = `${constants.AUTH_URL}/authorize?response_type=code&client_id=${constants.CLIENT_ID}&scope=openid profile email offline_access read:users&redirect_uri=${constants.REDIRECT_URL}`;

  return new Promise<string>((resolve, reject) => {
    Office.context.ui.displayDialogAsync(url, { height: 80, width: 30 }, function (result: any) {
      if (result.error) {
        reject(result.error);
      } else {
        messageDialog = result.value;
        messageDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
          try {
            resolve(processMessage(arg));
          } catch (error) {
            reject(error);
          }
        });
      }
    });
  });
}

async function processMessage(arg: any): Promise<string> {
  messageDialog.close();

  const authorizationCode = arg.message;
  return getToken(authorizationCode)
    .then(async (data) => {
      console.log("new new", data);

      window.localStorage.setItem("ocr_access_token", data.access_token);
      window.localStorage.setItem("ocr_refresh_token", data.refresh_token);
      let user = await getUser(data.access_token);
      window.localStorage.setItem("ocr_userName", user.name);
      window.localStorage.setItem("ocr_userEmail", user.email);
      window.localStorage.setItem("ocr_userId", user.sub);

      let key = await getProductKey(user.sub);
console.log(key);
      //const encryptedData = encryptData(user.sub);
      window.localStorage.setItem("ocr_productId", key.product_key);

      console.log(user);
      return data; // Returning the access token
    })
    .catch((error) => {
      console.error("Error in token exchange:", error);
      throw error;
    });
}
