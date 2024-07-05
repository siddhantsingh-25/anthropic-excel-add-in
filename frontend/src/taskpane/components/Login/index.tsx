import React, { useState } from "react";
import { Button, Spinner } from "@fluentui/react-components";
import { openAuthDialog } from "../Utilities/OpenAuthDialog/OpenAuthDialog";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [loader, setLoader] = useState(false);

  const navigate = useNavigate();
  const openAuth = () => {
    setLoader(true);
    openAuthDialog().then((res) => {
      console.log(res);
      setLoader(false);
      navigate("/Home");
    });
  };

  return (
    <>
      {loader && (
        <div className="loaderOverlay">
          <Spinner size="extra-large" className="spinner" />
          <p className="loadingText">Loading...</p>
        </div>
      )}
      <div className="loginContainer">
        <h1 className="title">QuickData</h1>
        <div className="content">
          <p className="description">Transform your data</p>
          <Button appearance="primary" onClick={openAuth} className="loginButton">
            Login
          </Button>
        </div>
        <p className="versionText">Pre-Production Testing v0.2.0</p>
      </div>
    </>
  );
};

export default Login;
