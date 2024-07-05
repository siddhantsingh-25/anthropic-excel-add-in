import { alpha, keyframes, styled } from "@mui/material/styles";
import React from "react";

const COLOR = "#0F6CBD";

const dotEffect = keyframes`
  0% {
      background-color: ${COLOR};
  }
  50%, 100% {
      background-color: ${alpha(COLOR, 0.2)};
  }
`;

const DotFlashing = styled("div")({
  position: "relative",
  width: "10px",
  height: "10px",
  borderRadius: "5px",
  backgroundColor: COLOR,
  color: COLOR,
  animation: `${dotEffect} 1s infinite linear alternate`,
  animationDelay: "0.5s",
  "&::before, &::after": {
    content: '""',
    display: "inline-block",
    position: "absolute",
    top: "0",
    backgroundColor: COLOR,
    color: COLOR,
    borderRadius: "5px",
    width: "10px",
    height: "10px",
  },
  "&::before": {
    left: "-15px",
    animation: `${dotEffect} 1s infinite alternate`,
    animationDelay: "0s",
  },
  "&::after": {
    left: "15px",
    animation: `${dotEffect} 1s infinite alternate`,
    animationDelay: "1s",
  },
});

const ThreeDots = () => {
  return (
    <div className="flex justify-center">
      <DotFlashing />
    </div>
  );
};

export default ThreeDots;
