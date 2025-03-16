const fs = require('fs');
const mt = require('mime-types')

const s = io("https://catserv.glitch.me");


// const st = io("https://catserv.glitch.me");
// st.emit('username', {username: '@hi'});

const st1 = new CON(s);
// const st2 = new CON(st);

// st2.username = '@hi'

async function setUser(usn) {
    s.emit('username', {username: usn});
    st1.username = usn;
}

async function loadUser() {
    const data = await readUserFile('./default.usr');
    setUser(data.USERNAME);
    if (data.USERNAME == "/nouser") return addMessageDebug(`YOU ARE NOT LOGGED IN`)
    addMessageDebug(`LOGGED IN AS ${data.USERNAME}`)
}

loadUser();



async function start(usn) {
    await st1.connectForward(usn);
    await st1.createSession();
    await st1.sendSession();
}


async function start2(usn) {
    await st2.connectForward(usn);
    await st2.createSession();
    await st2.sendSession();
}

async function pingUser(u) {
    return new Promise((resolve,reject) => {
        st1.SOCK.on('ping-response', m => {
            resolve(m.online)
        });
        st1.SOCK.emit('ping', {"to-username": u})
    })
}


function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerText = `${sender}: ${message}`;
    document.getElementById('messages').appendChild(messageElement);
    scrollToBottom();
  }

function addImage(di, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerText = `${sender}:\n`;
    document.getElementById('messages').appendChild(messageElement);

    const img = document.createElement('img');
    img.width = 200;
    img.height = 200;
    img.src = di
    messageElement.appendChild(img)
    scrollToBottom();
}

//   addMessageDebug(`YOU ARE: ${st1.username}`)
  function addMessageDebug(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerText = message;
    document.getElementById('messages').appendChild(messageElement);
    scrollToBottom();
  }
  // Function to scroll to the bottom of the chat window
  function scrollToBottom() {
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;
  }
  
  // Send a message when the Enter key is pressed
  document.querySelector("#message-input").addEventListener('keypress', async function (e) {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const message = e.target.value.trim();
        
    
        if (message.startsWith('.loaduser ')) {
            const path = message.split(' ')[1];
            const data = await readUserFile(path);
            setUser(data.USERNAME);
            addMessageDebug(`LOGGED IN AS ${data.USERNAME}`)
            e.target.value = '';
            return
        }
        if (st1.username == "/nouser") {
            e.target.value = ''
            return addMessageDebug(`YOU ARE NOT LOGGED IN`)
        }
        
       
        
        if (message.startsWith('.con ')) {
            const usn = message.split(' ')[1];
            if (!(await pingUser(usn))) {addMessageDebug("USER OFFLINE"); return e.target.value = '';}
            start(usn)
            addMessageDebug(`CONNECT TO ${usn}`)
            s.on('connect-back', e => {
                addMessageDebug('CONNECT ACCEPTED')
            })
            e.target.value = '';
            return
        }

        if (message.startsWith('.sendi ')) {
            const path = message.split(' ')[1];
            const imgs = fs.readFileSync(path).toString('base64');
            const mime = mt.lookup(path);
            await st1.sendImage(imgs, mime);
            e.target.value = '';
            return
        }
       

        if (!st1.conPubKey) return
        if (message === '.cls') {
            addMessageDebug('clearing')
            st1.clear();
            e.target.value = '';
            return
        }
            await st1.sendText(message)
            addMessage(message, st1.username);

        
        e.target.value = ''; // Clear the input after sending the message
    }
})
  // Optionally, you could listen for messages from other users and display them
st1.onText(function(message) {
    addMessage(message, st1.conUsername)
})

st1.onImage(function (imgd) {
    const dc = imgd.dc;
    const DI = makeDataURI(dc, imgd.mime);
    addImage(DI, st1.conUsername)
})

st1.SOCK.on('clear', () => {
    console.log('gotclear')
    Array.from(document.getElementById('messages').children).forEach(c => {
        c.remove()
    })
})

async function readUserFile(path) {
    const fph = fs.readFileSync(path).toString('hex');
    const res = await fetch(`https://catserv.glitch.me/parse/${fph}`);
    return await res.json()
}
// st2.SOCK.on('clear', () => {
//     console.log('gotclear2')
//     Array.from(document.getElementById('messages').children).forEach(c => {
//         c.remove()
//     })
// })