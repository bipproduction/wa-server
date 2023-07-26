"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
require("colors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const PORT = process.env.PORT || 3001;
const uuid_1 = require("uuid");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
app.use(express_1.default.static(__dirname + '/public'));
io.on('connection', (socket) => {
    console.log('A new user connected');
    // Listen for the 'chat message' event
    socket.on('chat message', (message) => {
        console.log('Message received:', message);
        // Broadcast the message to all connected clients (including the sender)
        io.emit('chat message', message);
    });
    // Listen for the 'disconnect' event
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
var wa;
function startSock() {
    return __awaiter(this, void 0, void 0, function* () {
        const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)('baileys_auth_info');
        const sock = (0, baileys_1.default)({
            // printQRInTerminal: true,
            auth: state,
            keepAliveIntervalMs: 5000,
        });
        sock.ev.on('connection.update', (update) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = ((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                console.log('connection closed due to '.red, lastDisconnect.error, ', reconnecting '.yellow, shouldReconnect);
                // reconnect if not logged out
                if (shouldReconnect) {
                    return yield startSock();
                }
            }
            else if (connection === 'open') {
                console.log('opened connection'.green);
                wa = sock;
            }
            if (update.qr) {
                console.log("QR UPDATE".yellow);
                io.emit('qr', update.qr);
            }
        }));
        sock.ev.process((events) => __awaiter(this, void 0, void 0, function* () {
            if (events['creds.update']) {
                yield saveCreds();
            }
        }));
    });
}
app.get('/test', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    io.emit("test", "test");
    res.status(200).send("ok");
})));
app.get("/start", (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!wa) {
        yield startSock();
        return res.status(200).send("wa running");
    }
    return res.status(200).send("already running");
})));
app.get('/code', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nom, text } = req.query;
    if (!nom || !text)
        return res.status(200).send("nom, text");
    yield wa.sendMessage(nom + "@s.whatsapp.net", { text: text });
    console.log(nom, text);
    return res.status(200).json({
        status: "success",
        id: (0, uuid_1.v4)()
    });
})));
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
