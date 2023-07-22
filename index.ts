
import makeWASocket, { useMultiFileAuthState as authSatate, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import 'colors'
import express from 'express'
import cors from 'cors'
import { Boom } from '@hapi/boom'

const app = express()
app.use(cors())

type kirim = {
    sendMessage: (no: string, { text }: { text: string }) => Promise<void>
}

var wa: kirim;

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
    })

    sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to '.red, lastDisconnect.error, ', reconnecting '.yellow, shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                return await startSock()
            }
        } else if (connection === 'open') {
            console.log('opened connection'.green)
            wa = sock as any
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

app.get('/code', async (req, res) => {
    const { nom, text } = req.query
    if (!nom || !text) return res.status(200).send("nom, text")
    await wa.sendMessage(nom + "@s.whatsapp.net", { text: text as string })
    return res.status(200).send("success")
})

app.listen(3001, async () => {
    await startSock()
    console.log("server berjalan di port 3001".green)
})



