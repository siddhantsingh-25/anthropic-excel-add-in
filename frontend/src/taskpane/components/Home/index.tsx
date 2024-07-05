import React from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Home.css";
import Footer from "../Footer";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Button } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";

const Home = () => {
  const navigate = useNavigate();
  const goAhead = () => {
    navigate("/ImageInput");
  };

  const CopyProductId = (value) => {
    const textToCopy = value;
    if (textToCopy) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          alert("Text copied to clipboard");
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    } else {
      console.error("No text content to copy");
    }
  };

  const productId = window.localStorage.getItem("ocr_productId");
  const displayedProductId = productId ? `${productId.substring(0, 5)}...` : "";

  return (
    <div>
      <div className="home">
        <div
          style={{
            textAlign: "center",
          }}
        >
          <h1 className="home_header" style={{ paddingBottom: "10px" }}>
            Welcome
          </h1>
          <h3 style={{ marginTop: "0", fontSize: "1.2em", color: "#555" }}>Your Product Key:</h3>
          <div className="home_key">
            <h3 style={{ wordBreak: "break-word", padding: "5px" }}>
              {displayedProductId}
              <span onClick={() => CopyProductId(productId)} className="copy">
                <Tooltip title="Copy Key" placement="top" arrow>
                  <IconButton color="primary" aria-label="ContentCopyIcon">
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </span>
            </h3>
          </div>
        </div>

        <ul className="home_list">
          <li>Copy the above product key with the provided button</li>
          <li>
            Right click on the screenshot tool icon in the icon tray, click 'enter product key', then paste this key in
          </li>
          <li>Finally, restart the screenshot tool and click 'Get Started' below</li>
        </ul>

        <Button variant="contained" onClick={goAhead}>
          Get Started
        </Button>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
