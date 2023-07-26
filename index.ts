
import makeWASocket, { useMultiFileAuthState as authSatate, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import 'colors'
import express from 'express'
import cors from 'cors'
import { Boom } from '@hapi/boom'
const PORT = process.env.PORT || 3001
import { v4 } from 'uuid'
import handler from 'express-async-handler'
import http from 'http'
import { Server, Socket } from 'socket.io'
import fs from 'fs'

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server)
app.use(express.static(__dirname + '/public'));

io.on('connection', (socket: Socket) => {
    console.log('A new user connected');

    // Listen for the 'disconnect' event
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

});

type kirim = {
    sendMessage: (no: string, { text }: { text: string }) => Promise<void>
}

var wa: kirim;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        // printQRInTerminal: true,
        auth: state,
        keepAliveIntervalMs: 5000,
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update as any
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            //console.log('connection closed due to '.red, lastDisconnect.error, ', reconnecting '.yellow, shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                return await startSock()
            }
        } else if (connection === 'open') {
            console.log('opened connection'.green)
            wa = sock as any
        }

        if (update.qr != undefined && update.qr != null) {
            console.log("QR UPDATE".yellow, update.qr)
            io.emit('qr', update.qr)
            // qrCode.generate(update.qr, {
            //     small: true
            // })
        }

        if (update.connection) {
            io.emit("con", update.connection)
            console.log("con".cyan)
        }
        if (update.isNewLogin) {
            io.emit("new", update.isNewLogin)
            console.log("new".cyan)
        }
        if (update.isOnline) {
            io.emit("online", update.isOnline)
            console.log("online".cyan)
        }
        if (update.lastDisconnect) {
            io.emit("dis", update.lastDisconnect)
            console.log("dis".cyan)
        }

    })

    sock.ev.process(
        async (events) => {
            if (events['creds.update']) {
                await saveCreds()
            }

        }
    )


}

app.post('/reset', handler(async (req: any, res: any) => {
    const { pwd } = req.body

    if (!pwd) return res.status(404)

    if (pwd === 1234) {
        if (fs.existsSync("auth")) {
            fs.unlinkSync("./auth");
            console.log("success")
        }
    }

    res.status(200).send("ok")
}))

app.get('/test', handler(async (req, res) => {
    io.emit("test", "test")
    res.status(200).send("ok")
}))

app.get("/start", handler(async (req: any, res: any) => {
    if (!wa) {
        await startSock()
        return res.status(200).send("wa running")
    }
    return res.status(200).send("already running")
}))


app.get('/code', handler(async (req: any, res: any) => {

    if (!wa) {
        await startSock()
        return res.status(200).send("start wa, please repeate message")
    }

    const { nom, text } = req.query
    if (!nom || !text) return res.status(200).send("nom, text")
    await wa.sendMessage(nom + "@s.whatsapp.net", { text: decodeURIComponent(text) as string })
    console.log(nom, text)
    return res.status(200).json({
        status: "success",
        id: v4()
    })
}))

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


