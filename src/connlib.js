function makeDataURI(b64, mt) {
    return `data:${mt};base64,${b64}`
}

class CON {
    constructor(socket, username) {
        this.SOCK = socket;
        this.createKeyPair();
        this.kp = null;
        this.sk = null;
        this.username = username;
        this.conUsername = "";
        this.conPubKey = null;
        this.conSk = null;
        this.listen();
        this.mtFuncs = [];
        this.miFuncs = []
        this.pr = {}
    }

    async createKeyPair() {
        this.kp = await CRYPT.KeyPair();
        return this.kp;
    }

    async createSession() {
        this.sk = await CRYPT.Session();
    }

    async connectForward(user) {
        this.SOCK.emit('connect-forward', {
            'request': 'pending',
            'username': this.username,
            'to-username': user,
            'public-key': await CRYPT.KeyToB64(this.kp.publicKey),
            'time': new Date().toJSON()
        })

        return new Promise((resolve, reject) => {
            this.SOCK.on('connect-back', () => {
                resolve()
            })
        });
    }

    async connectBack(user) {
        
        this.SOCK.emit('connect-back', {
            'request': 'accepted',
            'username': this.username,
            'to-username': user,
            'public-key': await CRYPT.KeyToB64(this.kp.publicKey),
            'time': new Date().toJSON()
        })
        
    }

    async sendSession() {
        if (!this.conPubKey) throw new Error("not connected to a public key");
        const ensk = await CRYPT.EncryptSession(this.sk, this.conPubKey);
        console.log('sent encrypted session')
        return this.SOCK.emit('session', {
            'session': await CRYPT.BufferToB64(ensk),
            'username': this.username,
            'to-username': this.conUsername
        })

    }

    async sendText(td) {
        const encryptedData = await CRYPT.EncryptMessage(td, this.sk);
        return this.SOCK.emit('text-message', {
            'ciphertext': encryptedData.encryptedMessage,
            'iv': encryptedData.iv,
            'username': this.username,
            'to-username': this.conUsername
        })
    }

    async sendImage(b64, mt) {
        const encryptedData = await CRYPT.EncryptMessage(b64, this.sk);
        return this.SOCK.emit('image-message', {
            'ciphertext': encryptedData.encryptedMessage,
            'iv': encryptedData.iv,
            'username': this.username,
            'to-username': this.conUsername,
            'mime': mt
        })
    }

    setSk(sk) {
        this.sk = sk;
    }

    setConU(u) {
        this.conUsername = u;
    }

    async listen() {
        const setSession = this.setSk;
        const setConU = this.setConU;

        this.SOCK.on('connect-forward', async (msg) => {
            const conu = msg['username'];
            console.log(this.conUsername = conu)
            this.conPubKey = await CRYPT.B64ToKey(msg['public-key']);
            return await this.connectBack(msg['username']);

        })

        this.SOCK.on('connect-back', async (msg) => {
            const conu = msg['username'];
            console.log(this.conUsername = conu)
            this.conPubKey = await CRYPT.B64ToKey(msg['public-key']);
            // console.log(`connected to ${conUsername}`)
        })

        this.SOCK.on('session', async (msg) => {
            let ensk = msg.session;
            const rawkey = await CRYPT.B64ToBuffer(ensk);
            const newsk = await CRYPT.DecryptSession(rawkey, this.kp.privateKey);
            this.sk = newsk;
            console.log(`recieved session from ${this.conUsername}`)
        })

        this.SOCK.on('text-message', async (msg) => {
            console.log(`got encrypted message from ${msg.username}`)
            console.log('encrypted data: ' + msg.ciphertext);
            const dc = await CRYPT.DecryptMessage(msg.ciphertext, msg.iv, this.sk);
            // console.log('decrypted: ' + dc)
            this._otm(dc)
        })

        this.SOCK.on('image-message', async (msg) => {
            console.log(`got encrypted image message from ${msg.username}`)
            console.log('encrypted data b64: ' + msg.ciphertext.slice(0,5));
            const dc = await CRYPT.DecryptMessage(msg.ciphertext, msg.iv, this.sk);
            console.log('decrypted: ' + dc.slice(0,5))
            this._oim({...msg, dc: dc})
        })
    }

    clear() {
        this.SOCK.emit('clear', {
            'username': this.username,
            'to-username': this.conUsername
        })
    }

    _otm(data) {
        this.mtFuncs.forEach(f => f(data))
    }

    onText(func) {
        this.mtFuncs.push(func);
        return func;
    }

    _oim(data) {
        this.miFuncs.forEach(f => f(data))
    }

    onImage(func) {
        this.miFuncs.push(func);
        return func;
    }

}