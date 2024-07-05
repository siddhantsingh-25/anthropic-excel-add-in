import * as React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import Home from "./components/Home";
import { JsonData, childDataToParent } from "../taskpane/components/Types";
import ValidateResponse from "./components/ValidateResponse";
/* global document, Office, module, require */

const rootElement: HTMLElement | null = document.getElementById("container1");
const root = rootElement ? createRoot(rootElement) : undefined;

let messageFromChild: childDataToParent | null = null; // Initialize messageFromChild as null

let stateParam: string | null = null; // Initialize stateParam as null
let columnIndex: number | null = null; // Initialize stateParam as null

let rowIndex: number | null = null; // Initialize stateParam as null

const searchParams = new URLSearchParams(window.location.search);
stateParam = searchParams.get("state");
columnIndex = Number(searchParams.get("column"));
rowIndex = Number(searchParams.get("row"));

console.log(stateParam);
Office.onReady(() => {
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, (args) => {
    try {
      messageFromChild = JSON.parse(args.message);

      // Check if jsonData is in the expected format
      if (!messageFromChild) {
        throw new Error("Invalid JSON data format");
      }

      console.log(messageFromChild);

      // Once jsonData is received and validated, re-render the app with the updated state
      if (root && messageFromChild) {
        renderApp(messageFromChild.jsonData, stateParam, messageFromChild.imageSrc, columnIndex, rowIndex);
      }
    } catch (error) {
      console.error("Error processing JSON data:", error);
      // Handle the error gracefully, such as displaying a notification to the user
    }
  });

  Office.context.ui.messageParent(JSON.stringify({ message: "IAmReady" }));

  // Accessing query parameters here
});

// Function to render the app with the given jsonData
function renderApp(jsonData: JsonData, screen: string, imageSrc: string, columnIndex: number, rowIndex: number) {
  root?.render(
    <FluentProvider theme={webLightTheme}>
      {screen === "fullScreen" ? (
        <ValidateResponse jsonData={jsonData} column={columnIndex} row={rowIndex} />
      ) : (
        <Home jsonData={jsonData} imageSrc={imageSrc} />
      )}
    </FluentProvider>
  );
}

if ((module as any).hot) {
  (module as any).hot.accept("./components/Home", () => {
    const NextApp = require("./components/Home").default;
    root?.render(NextApp);
  });
}
