import constants from "../../../Constants";
export async function getToken(authorizationCode: string): Promise<any> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", authorizationCode);
  params.append("redirect_uri", constants.REDIRECT_URL);
  params.append("client_id", constants.CLIENT_ID);

  try {
    const response = await fetch(constants.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
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

export async function refreshToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", constants.CLIENT_ID);
  params.append("refresh_token", window.localStorage.getItem("ocr refresh_token"));

  try {
    const response = await fetch(constants.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    window.localStorage.setItem("accessToken", data.access_token);
    return data.access_token; // Or return the full response if more data is needed
  } catch (error) {
    console.error("Failed to exchange token:", error);
    throw new Error("Failed to exchange authorization code for token");
  }
}

export async function getUser(token: string): Promise<any> {
  try {
    const response = await fetch(`${constants.AUTH_URL}/userinfo`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
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

