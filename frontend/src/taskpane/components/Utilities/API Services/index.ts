import axios from "axios";
import { JsonData, Message } from "../../Types";
import constants from "../../../../Constants";

export const handleOcrAndInsert = async (
  imageSrc: string,
  setMessages: (messages: Message[]) => void,
  setJsonData: (jsonData: JsonData | null) => void
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const base64Image = imageSrc.split(",")[1];
      const imageType = imageSrc.split(";")[0].split(":")[1];

      const requestData = {
        imageUrl: base64Image,
        imageType: imageType,
      };

      const response = await axios.post(`${constants.API_URL}${constants.OCR_ENDPOINT}`, requestData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.status === 200) {
        const data = response.data.text;
        const { messages } = response.data;
        setMessages(messages);
        const jsonData = JSON.parse(data);
        const rowsWithIds = jsonData.data.RowData.map((item, index) => ({
          ...item,
          id: `${Date.now()}_${index}`, // Unique ID using timestamp + index
        }));
        jsonData.data.RowData = rowsWithIds;
        setJsonData(jsonData);

        resolve(); // Resolve the promise if everything is successful
      } else {
        console.log(`Error: OCR API error: ${response.status} ${response}`);
        reject(new Error(`OCR API error: ${response.status}`)); // Reject the promise with an error
      }
    } catch (error) {
      console.log(`Error occurred while processing the image: ${error}`);
      reject(error); // Reject the promise with the caught error
    }
  });
};

export const fetchScreenshot = (setImageSrc: (imageSrc: string) => void): Promise<void> => {
  const fetchImage = async (): Promise<string> => {
    try {
      const response = await fetch(`${constants.API_URL}/get_picture/${window.localStorage.getItem("ocr_userId")}`);
      const data = await response.json();
      console.log("Received image data:", data);

      if (data.imageBase64) {
        return `data:image/png;base64,${data.imageBase64}`;
      } else {
        if (data.status === 401) {
          return "NotSignedIn:";
        } else {
          throw new Error("An error occured");
        }
      }
    } catch (error) {
      console.error("Error fetching screenshot:", error);
      throw error;
    }
  };

  const retryFetchImage = async (): Promise<void> => {
    while (true) {
      try {
        const imageSrc = await fetchImage();
        setImageSrc(imageSrc);
        return; // Exit the loop once the image is successfully fetched and set
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  return new Promise<void>(async (resolve, reject) => {
    try {
      await retryFetchImage();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};


export async function getProductKey(userId: string): Promise<any> {
  try {
    const response = await fetch(`${constants.API_URL}/get_encrypted_user_details`, {
      method: "POST",
      headers: {
        Accept: "/",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Or return the full response if more data is needed
  } catch (error) {
    console.error("Failed to exchange token:", error);
    throw new Error("Failed to exchange authorization code for token");
  }
}

export async function logOut(userId: string): Promise<any> {
  try {
    const response = await fetch(`${constants.API_URL}/logout`, {
      method: "POST",
      headers: {
        Accept: "/",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Or return the full response if more data is needed
  } catch (error) {
    console.error("Failed to exchange token:", error);
    throw new Error("Failed to exchange authorization code for token");
  }
}
