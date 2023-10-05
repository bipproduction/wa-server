import { Boom } from '@hapi/boom'
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import 'colors'
import cors from 'cors'
import fetch from 'cross-fetch'
import express from 'express'
import handler from 'express-async-handler'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { Server, Socket } from 'socket.io'
import url from 'url'
import { v4 } from 'uuid'
import yaml from 'yaml'
import { CONFIG } from './models/CONFIG'
const config: CONFIG = yaml.parse(fs.readFileSync(path.join(__dirname, "./config.yaml")).toString())
const PORT = config.server.port

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

    sock.ev.on("messages.upsert", (val) => {

        try {
            if (!val) return console.log("no val".red)
            let msg = val.messages[0].message?.conversation
            if (!msg) {
                msg = val.messages[0].message?.extendedTextMessage?.text
            }
            if (!msg) return console.log("no msg".red)
            const { pswd } = url.parse(msg!, true).query
            const host = url.parse(msg!, true).host
            const isStartHttps = msg.startsWith("https://")

            if (pswd && isStartHttps) {
                const senderName = val.messages[0].pushName
                const sender = val.messages[0].key.remoteJid?.split("@")[0]
                const body = {
                    sender,
                    senderName,
                    msg
                }

                console.log(`send post ${msg}`)

                fetch(msg as string, {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).then(async (v) => {

                    // sock.sendMessage(val.messages[0].key.remoteJid as string, { text: decodeURIComponent(`send to ${host} ...`) as string }).catch((e) => {
                    //     console.log("error balas pesan".red)
                    // })

                    if (v.status === 201) {
                        const text = await v.text()
                        sock.sendMessage(val.messages[0].key.remoteJid as string, { text: decodeURIComponent(text) as string }).catch((e) => {
                            console.log("error balas pesan".red)
                        })
                    }
                }).catch((err) => {
                    console.log(`${err}`.red)
                })


            } else {
                console.log("no host or pswd".red)
            }
        } catch (error) {
            console.log(`${error}`.red)
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


