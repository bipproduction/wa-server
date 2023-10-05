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
const cors_1 = __importDefault(require("cors"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const yaml_1 = __importDefault(require("yaml"));
const config = yaml_1.default.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, "./config.yaml")).toString());
const PORT = config.server.port;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
app.use(express_1.default.static(__dirname + '/public'));
io.on('connection', (socket) => {
    console.log('A new user connected');
    // Listen for the 'disconnect' event
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
var wa;
function startSock() {
    return __awaiter(this, void 0, void 0, function* () {
        const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)('auth');
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
                if (shouldReconnect) {
                    return yield startSock();
                }
            }
            else if (connection === 'open') {
                console.log('opened connection'.green);
                wa = sock;
            }
            if (update.qr != undefined && update.qr != null) {
                console.log("QR UPDATE".yellow, update.qr);
                io.emit('qr', update.qr);
            }
            if (update.connection) {
                io.emit("con", update.connection);
                console.log("con".cyan);
            }
            if (update.isNewLogin) {
                io.emit("new", update.isNewLogin);
                console.log("new".cyan);
            }
            if (update.isOnline) {
                io.emit("online", update.isOnline);
                console.log("online".cyan);
            }
            if (update.lastDisconnect) {
                io.emit("dis", update.lastDisconnect);
                console.log("dis".cyan);
            }
        }));
        sock.ev.on("messages.upsert", (val) => {
            var _a, _b, _c, _d;
            try {
                if (!val)
                    return console.log("no val".red);
                let msg = (_a = val.messages[0].message) === null || _a === void 0 ? void 0 : _a.conversation;
                if (!msg) {
                    msg = (_c = (_b = val.messages[0].message) === null || _b === void 0 ? void 0 : _b.extendedTextMessage) === null || _c === void 0 ? void 0 : _c.text;
                }
                if (!msg)
                    return console.log("no msg".red);
                // const { pswd } = url.parse(msg!, true).query
                // const host = url.parse(msg!, true).host
                const isStartwith = msg.startsWith("bipsrv");
                if (isStartwith) {
                    const senderName = val.messages[0].pushName;
                    const sender = (_d = val.messages[0].key.remoteJid) === null || _d === void 0 ? void 0 : _d.split("@")[0];
                    const body = {
                        sender,
                        senderName,
                        msg
                    };
                    console.log(`send post ${msg}`);
                    (0, cross_fetch_1.default)("https://log.wibudev.com", {
                        method: "POST",
                        body: JSON.stringify(body),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }).then((v) => __awaiter(this, void 0, void 0, function* () {
                        if (v.status === 201) {
                            const text = yield v.text();
                            sock.sendMessage(val.messages[0].key.remoteJid, { text: decodeURIComponent(text) }).catch((e) => {
                                console.log("error balas pesan".red);
                            });
                        }
                    })).catch((err) => {
                        console.log(`${err}`.red);
                    });
                }
                else {
                    console.log("no host or pswd".red);
                }
            }
            catch (error) {
                console.log(`${error}`.red);
            }
        });
        sock.ev.process((events) => __awaiter(this, void 0, void 0, function* () {
            if (events['creds.update']) {
                yield saveCreds();
            }
        }));
    });
}
app.post('/reset', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pwd } = req.body;
    if (!pwd)
        return res.status(404);
    if (pwd === 1234) {
        if (fs_1.default.existsSync("auth")) {
            fs_1.default.unlinkSync("./auth");
            console.log("success");
        }
    }
    res.status(200).send("ok");
})));
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
    if (!wa) {
        yield startSock();
        return res.status(200).send("start wa, please repeate message");
    }
    const { nom, text } = req.query;
    if (!nom || !text)
        return res.status(200).send("nom, text");
    yield wa.sendMessage(nom + "@s.whatsapp.net", { text: decodeURIComponent(text) });
    console.log(nom, text);
    return res.status(200).json({
        status: "success",
        id: (0, uuid_1.v4)()
    });
})));
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
