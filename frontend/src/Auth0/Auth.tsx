import * as React from "react";
import { createRoot } from "react-dom/client";
import Home from "./components/Home";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
//import { Auth0Provider } from "@auth0/auth0-react";

/* global document, Office, module, require */

const rootElement: HTMLElement | null = document.getElementById("container2");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application after Office initializes */
Office.onReady(() => {
  root?.render(
    <FluentProvider theme={webLightTheme}>
      <Home />
    </FluentProvider>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/Home", () => {
    const NextApp = require("./components/Home").default;
    root?.render(NextApp);
  });
}
