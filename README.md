# Snake Project

The snake project requires the front-end to be hosted, and for multiplayer the server to be hosted seperately.

## Setting Up

Install [NodeJS LTS](https://nodejs.org/en/download/current), and the Node Package Manager (`npm`) along with it.

### Client / Front-End

-   With the command prompt, enter `npm i -g http-server`
-   With the command prompt, navigate to the `client` directory and enter the command `http-server -p 5001` to host the client on port `5001`. The client should be available to other people on the same Wi-Fi network at the links provided.

### Multiplayer Server / Back-End

-   With the command prompt, navigate to the `server` directory, enter the command `npm i` to install the dependencies and then enter the command `node app` to start the server. The server should be accessible at port `3000`.

## Multiplayer

To play multiplayer after following the above steps, after navigating to the website and on the multiplayer page, enter a name and click the button to join the queue. 4 players are needed to start the game instantly, or after 30 seconds with a minimum of 2 players.
