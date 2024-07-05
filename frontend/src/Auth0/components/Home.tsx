import React from "react";
//import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@fluentui/react-components";

const Home = () => {
  // const { loginWithRedirect, logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  // useEffect(() => {
  //   const handleAuthentication = async () => {
  //     if (isAuthenticated) {
  //       try {
  //         const accessToken = await getAccessTokenSilently();
  //         const refreshToken = localStorage.getItem(
  //           `@@auth0spajs@@::SNz9z1pIvFrwI6MLYDCajFCHqBAD1Hdi::default::openid profile email offline_access`
  //         );

  //         if (accessToken && refreshToken) {
  //           Office.context.ui.messageParent(JSON.stringify({ accessToken, refreshToken }));
  //         }
  //       } catch (error) {
  //         console.error("Error getting tokens:", error);
  //       }
  //     }
  //   };

  //   handleAuthentication();
  // }, [isAuthenticated, getAccessTokenSilently]);

  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }

  return (
    <div>
      <h1>Auth0 Implementation...</h1>
    </div>
  );
};

export default Home;
