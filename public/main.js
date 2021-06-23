//jshint esversion:6

var divSelectRoom = document.getElementById('selectRoom');
var divConsultingRoom = document.getElementById('consultingRoom');
var btnGoRoom = document.getElementById('goRoom');
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');
var inputRoomNumber = document.getElementById('roomNumber');
var msgSection = document.getElementById('msgs');
var inputCallName = document.getElementById('inputCallName');
var btnSetName = document.getElementById('setName');
var chatSection = document.getElementById('chats');
var muteButton = document.getElementById('muteButton');

const socket = io();
var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;
var isCaller;
var dataChannel;
const iceServers = {
	'iceServer':[
	{'urls': 'stun:stun.l.google.com:19302'},
	{'urls': 'stun:stun1.l.google.com:19302'}
	]
};
const streamConstraints = {
	audio: true,
	video: true
};

btnGoRoom.onclick = async function() {
  if (!inputRoomNumber.value) {
    alert('please enter room name');
  } else {
    roomNumber = inputRoomNumber.value;
    socket.emit('create or join', roomNumber);
    divSelectRoom.style = 'display: none';
    divConsultingRoom.style = 'display: inline-block';
    chatSection.style = 'display: inline-block';
  }
}
btnSetName.onclick = async function () {
  if (!inputCallName.value) {
    alert('please enter a valid message');
  } else {
    dataChannel.send(inputCallName.value);
    var newMsg = document.createElement('div');
    newMsg.setAttribute('id', 'myMsg');
    newMsg.innerText = inputCallName.value;
    msgSection.appendChild(newMsg);
    inputCallName.value = "";
  }
}

socket.on('created', async function (room) {
  localStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
  localVideo.srcObject = localStream;
  isCaller = true;
});

socket.on('joined', async function (room) {
  localStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
  localVideo.srcObject = localStream;
  socket.emit('ready', roomNumber);
});

//event for cutting video and audio of the localVideo
localVideo.onclick = async function(){
  if(localStream.getTracks()[1].enabled === false){
    localStream.getTracks()[1].enabled = true;
    localStream.getTracks()[0].enabled = true;
  }
  else{
    localStream.getTracks()[0].enabled = false;
    localStream.getTracks()[1].enabled = false;
  }
}

socket.on('ready', async function (room) {
  if (isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onicecandidate;
    rtcPeerConnection.ontrack = onAddStream;
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    dataChannel = rtcPeerConnection.createDataChannel(roomNumber);
    const sdp = await rtcPeerConnection.createOffer();
    rtcPeerConnection.setLocalDescription(sdp);
    socket.emit('offer', {
      type: 'offer',
      sdp: sdp,
      room: roomNumber,
    });
    dataChannel.onmessage = (event => { 
      console.log('data channel msg giving');
		var new1 = document.createElement('div');
    new1.setAttribute('id', 'yourMsg');
    new1.innerText = event.data;
    msgSection.appendChild(new1);
    })
  }
});


socket.on('offer', async function (event) {
  if (!isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onicecandidate;
    rtcPeerConnection.ontrack = onAddStream;
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection.ondatachannel = event => {
      dataChannel = event.channel;
      dataChannel.onmessage = event => {
        var new2 = document.createElement('div');
        new2.setAttribute('id', 'yourMsg');
        new2.innerText = event.data;
        msgSection.appendChild(new2); 
        }
    };
    const sdp = await rtcPeerConnection.createAnswer();
    rtcPeerConnection.setLocalDescription(sdp);
    socket.emit('answer', {
      type: 'answer',
      sdp: sdp,
      room: roomNumber,
    });

  }
});

socket.on('candidate',  function (event) {
  console.log('received candidate event', event)
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.lable,
    candidate: event.candidate.candidate,
    sdpMid: event.id,
  });
  
  rtcPeerConnection.addIceCandidate(candidate);
});

socket.on('answer', async function (event) {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

function onAddStream(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
}

function onicecandidate(event) {
  if(event.candidate) {
    console.log(`sending ice candidate`, event.candidate);
    const outgoing = {
      type: 'candidate',
      lable: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate,
      room: roomNumber
    }
    console.log(outgoing)
    socket.emit('candidate', outgoing);
  }
}
