import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from "react";
import ThreeDots from "../three-dots/ThreeDots";
import "./CountDown.css";
interface CountDownProps {
  value: number;
}

const CountDown: React.FC<CountDownProps> = ({ value }) => {
  const [counter, setCounter] = React.useState(value);

  React.useEffect(() => {
    if (counter <= 0) return undefined;

    const timer = setInterval(() => {
      setCounter((prevCounter) => prevCounter - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [counter]);

  return (
    <div
      className="text-center"
      style={{
        marginTop: "40px",
      }}
    >
      <Typography variant="h5">OCR is Extracting</Typography>
      <div className="flex items-center justify-center h-12">
        {counter > 0 ? (
          <Box
            component="p"
            sx={{
              color: "#0F6CBD",
              textAlign: "center",
              fontSize: "42px",
              marginTop: "15px",
            }}
          >
            {counter}
          </Box>
        ) : (
          <div className="threedots">
            <ThreeDots />
          </div>
        )}
      </div>
    </div>
  );
};

export default CountDown;
