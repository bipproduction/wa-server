export interface MESSAGE {
    messages: Message[]
    type: string
}

export interface Message {
    key: Key
    messageTimestamp: number
    pushName: string
    broadcast: boolean
    message: Message2
}

export interface Key {
    remoteJid: string
    fromMe: boolean
    id: string
}

export interface Message2 {
    conversation: string
    messageContextInfo: MessageContextInfo
}

export interface MessageContextInfo {
    deviceListMetadata: DeviceListMetadata
    deviceListMetadataVersion: number
}

export interface DeviceListMetadata {
    senderKeyHash: string
    senderTimestamp: string
    recipientKeyHash: string
    recipientTimestamp: string
}
