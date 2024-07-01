import * as React from "react";
import { useState, useEffect } from "react";
import { Button, Spinner } from "@fluentui/react-components";
import insertText from "../office-document";
import axios from "axios";
import TableRetry from "./TableRetry";
import "../styles/ImageInput.css";
import { io } from "socket.io-client";
import TableIteration from "./TableIteration";

const ImageInput: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [jsonData, setJsonData] = useState<{
    detectedType: string;
    data: {
      ColumnData?: { [key: string]: string };
      RowData: { [key: string]: string | number }[];
    };
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ [key: string]: any }[]>([]);
  const [titleText, setTitleText] = useState<string>("Awaiting Image");
  const [showTableRetry, setShowTableRetry] = useState(false);

  useEffect(() => {
    if (imageSrc) {
      setTimeout(handleOcrAndInsert, 100); // Wait .1 second
    }
  }, [imageSrc]);

  useEffect(() => {
    const fetchScreenshot = async () => {
      try {
        const response = await axios.get("https://api.quickdata.ai/get_picture");
        const data = response.data;
        console.log("Received image data:", data);
        if (data.screenshot) {
          setImageSrc(`data:image/png;base64,${data.screenshot}`);
        } else {
          setImageSrc("");
          setTimeout(fetchScreenshot, 1000); // Retry after a short delay if image is not available
        }
      } catch (error) {
        console.error("Error fetching screenshot:", error);
        setTimeout(fetchScreenshot, 1000); // Retry after a short delay if an error occurs
      }
    };

    fetchScreenshot(); // Start the initial fetch

    return () => {
    };
  }, []);

  const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    const itemsArray = Array.from(items);
    for (const item of itemsArray) {
      if (item.type.startsWith("image")) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (readEvent) => {
            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              const maxWidth = 800;
              const maxHeight = 600;
              let width = image.width;
              let height = image.height;

              if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
              }

              if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
              }

              canvas.width = width;
              canvas.height = height;
              context?.drawImage(image, 0, 0, width, height);
              setImageSrc(canvas.toDataURL());
              handleOcrAndInsert();
            };
            image.src = readEvent.target?.result as string;
          };
          reader.readAsDataURL(blob);
        }
        event.preventDefault();
        break;
      }
    }
  };

  const handleOcrAndInsert = async () => {
    if (!imageSrc) {
      console.log("OCR attempted without an image source.");
      return;
    }

    console.log("Starting OCR process...");
    setIsLoading(true);
    setTitleText("Processing Image..."); // Update text to reflect ongoing processing

    try {
      const base64Image = imageSrc.split(",")[1];
      const requestData = {
        imageUrl: base64Image,
        imageType: "image/png",
      };

      const response = await axios.post("https://api.quickdata.ai/ocr", requestData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("OCR response received", response);
      if (response.status === 200) {
        const data = JSON.parse(response.data.text);
        setJsonData(data);
        setMessages(response.data.messages || []);
        console.log("OCR Data:", data);
        setShowTableRetry(true); // Set showTableRetry to true when OCR is complete
      } else {
        console.error(`OCR API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error during OCR process:", error);
    } finally {
      setIsLoading(false);
      setTitleText("Image Processed"); // Indicate processing is complete
    }
  };

  const handleReset = () => {
    setImageSrc("");
    setJsonData(null);
    setTitleText("Awaiting Image");
    setShowTableRetry(false); // Reset showTableRetry to false
  };

  return (
    <div className="image-input-container" style={{ height: "120vh", overflow: "hidden" }}>
      {showTableRetry ? (
        <TableRetry initialJsonData={jsonData} onReset={handleReset} messagesContext={messages} imageSrc={imageSrc} />
      ) : (
        <>
          <h2 className="image-input-title">{titleText}</h2>
          <div
            className={`image-input-area ${imageSrc ? "has-image" : ""}`}
            contentEditable={false} // Make the entire div non-editable
            onPaste={handleImagePaste}
          >
            {imageSrc ? (
              <img src={imageSrc} alt="Pasted" className="image-input-preview" />
            ) : (
              <span className="image-input-placeholder">Send image from screenshot tool or paste an image here</span>
            )}
          </div>
          <div className="image-input-actions">
            <Button
              className="image-input-button"
              appearance="subtle"
              disabled={!imageSrc}
              onClick={handleReset}
              style={{ backgroundColor: "lightcoral", color: "white" }}
            >
              Reset
            </Button>
            {isLoading && <Spinner label="Processing..." />}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageInput;

//Make sure image paste still works properly
