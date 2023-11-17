# Snake Project

The snake project for a university class requires the front-end to be hosted, and for multiplayer the server to be hosted seperately.

## Setting Up

### Client / Front-End

-   Install [VSCode](https://code.visualstudio.com/)
-   Install the [Live Server extension for VSCode](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
-   Open the `client` directory in VSCode and with the `Snake.html` file **opened** and **active**, click the `Go Live` button on the bottom right corner of the IDE. Ensure the port opened is **NOT** `:3000`.
-   The client should be accessible at `127.0.0.1:{port}/client/Snake.html`

### Multiplayer Server / Back-End

-   Install [NodeJS LTS](https://nodejs.org/en/download/current), and the Node Package Manager (`npm`) along with it.

-   With the command prompt, navigate to the `server` directory, enter the command `npm i` to install the dependencies and then enter the command `node app` to start the server. The server should be accessible at port `3000`.

-   For other people to access the game, on windows with the command prompt enter the command `ipconfig`, and the website should be accessible for people at the same Wi-Fi network, at the ip address listed as `IPv4 Address. . . . . . . . . .  : x.x.x.x` with the `client` port: `x.x.x.x:{port}/client/Snake.html`.

-   On Mac to get the ip address, enter `ipconfig getifaddr en1` (wireless) or `ipconfig getifaddr en0` (ethernet).

## Multiplayer

To play multiplayer after following the above steps, after navigating to the website and on the multiplayer page, enter a name and click the button to join the queue. 4 players are needed to start the game instantly, or after 30 seconds with a minimum of 2 players.
