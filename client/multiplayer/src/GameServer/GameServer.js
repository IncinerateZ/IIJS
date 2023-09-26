export default class GameServer {
    constructor(io) {
        this.io = io;
        this.ip = window.location.hostname;

        this.socket = io(`${this.ip}:3000`);

        this.socket.on('master', (msg) => {
            console.log(`Received ${msg}`);
        });

        let pong = 0;

        function ping(socket) {
            console.log('Pinged');
            pong = new Date().getTime();
            socket.emit('ping', 'ping');
        }
    }
}
