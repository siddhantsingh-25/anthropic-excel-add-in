import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@fluentui/react-components";
import { handleOcrAndInsert, fetchScreenshot } from "../Utilities/API Services";
import "../Styles/imageInput.css";
import { JsonData, Message } from "../Types";
import { processImage } from "../Utilities/Helpers/ImageProcessor";
import { OpenTableDialog } from "../Utilities/OpenImageInputDialog";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import ThreeDots from "../three-dots/ThreeDots";
import { useNavigate } from "react-router-dom";
import Footer from "../Footer";
import constants from "../../../Constants";

const ImageInput = () => {
  const hasOcrRequestBeenCalled = useRef(false);
  const navigate = useNavigate();
  const [imageSrc, setImageSrc] = useState<string>("");
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [fileBlob, setFileBlob] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [ImageInputScreen, setImageInputScreen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleImagePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.clipboardData.items;
    const itemsArray = Array.from(items);
    for (const item of itemsArray) {
      if (item.type.startsWith("image")) {
        const blob = item.getAsFile();
        setFileBlob(blob);
        console.log(blob);
        if (blob) {
          const dataURL = await processImage(blob);
          setImageSrc(dataURL);
        }
        break;
      }
    }
  };

  const handleOcrRequest = () => {
    if (imageSrc) {
      setLoading(true);
      handleOcrAndInsert(imageSrc, setMessages, setJsonData).then((res) => {
        console.log(res);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectToEventSource = () => {
      eventSource = new EventSource(
        `${constants.API_URL}/get_picture_event/${window.localStorage.getItem("ocr_userId")}`
      );

      eventSource.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (data !== "no_image") {
          setImageSrc(`data:image/png;base64,${data}`);
          closeEventSource();
        }
      };

      eventSource.onerror = () => {
        console.log("Error connecting to server eventsource. Reload component");
        closeEventSource();
      };
    };

    const closeEventSource = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    connectToEventSource();

    return () => {
      closeEventSource();
    };
  }, []);

  useEffect(() => {
    if (jsonData) {
      openDailog(jsonData); // Call openDailog with the updated jsonData
    }
  }, [jsonData]);

  useEffect(() => {
    if (imageSrc && !hasOcrRequestBeenCalled.current) {
      handleOcrRequest();
      hasOcrRequestBeenCalled.current = true;
    }
  }, [imageSrc]);

  const handleReset = () => {
    setImageSrc("");
    setJsonData(null);
    setLoading(false);
    hasOcrRequestBeenCalled.current = false; // Reset the ref
  };

  const resetScreen = () => {
    navigate("/Home");
  };

  const openDailog = (jsonData: JsonData) => {
    OpenTableDialog(jsonData, "TableIteration", -1, -1, imageSrc).then((res) => {
      console.log(res);
      navigate("/TableIteration", { state: { response: res } });
    });
  };

  return (
    <>
      <div
        style={{
          paddingTop: "10px",
        }}
      >
        {!jsonData ? (
          <div>
            <div className="image-input-container">
              <h2 className="image-input-title">{`${!imageSrc ? "Awaiting Image" : "Processing Image..."}`}</h2>
              <div
                className={`image-input-area ${imageSrc ? "has-image" : ""}`}
                contentEditable
                suppressContentEditableWarning={true}
                onPaste={handleImagePaste}
              >
                {imageSrc ? (
                  <img src={imageSrc} alt="Pasted" className="image-input-preview" />
                ) : (
                  <p contentEditable={false} className="image-input-placeholder">
                    Send image from screenshot tool or paste an image here
                  </p>
                )}
              </div>
              {loading && (
                <div
                  style={{
                    marginTop: "10px",
                  }}
                >
                  <Box className="loadingBox">
                    <ThreeDots />

                    <Typography style={{ marginTop: "10px" }} variant="h5">
                      OCR is Extracting
                    </Typography>
                  </Box>
                </div>
              )}
              <div className="image-input-actions">
                <Button
                  className="image-input-button"
                  style={{
                    backgroundColor: "#e83f3f",
                    color: "white",
                  }}
                  appearance="subtle"
                  disabled={!imageSrc}
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="reOpen">
            <div className="reopenScreen">
              <div>
                <h2 className="">Extracted Data</h2>
                <p>
                  Use the pop-up window to edit the information extracted from the image. Your original image is
                  included as a reference to compare to the OCR extraction. Double click a cell to edit.
                </p>
              </div>
              <div className="reopenScreen_buttons">
                <Button style={{ backgroundColor: "blue", color: "white" }} onClick={() => openDailog(jsonData)}>
                  Full Screen
                </Button>
                <Button style={{ backgroundColor: "red", color: "white" }} onClick={resetScreen}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ImageInput;