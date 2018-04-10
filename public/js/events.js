function playOther(roomnum) {
    socket.emit('play other', {
        room: roomnum
    });
}

socket.on('justPlay', function(data) {
    console.log("currPlayer")
    switch (currPlayer) {
        case 0:
            if (playerStatus == -1 || playerStatus == 2) {
                player.playVideo()
            }
            break;
        case 1:
            if (dailyPlayer.paused) {
                dailyPlayer.play();
            }
            break;
    }
});

function pauseOther(roomnum) {
    socket.emit('pause other', {
        room: roomnum
    });
    //socket.broadcast.to("room-"+roomnum).emit('justPlay');
}

socket.on('justPause', function(data) {
    console.log("hiIamPausing!")
    switch (currPlayer) {
        case 0:
            player.pauseVideo()
            break;
        case 1:
            dailyPlayer.pause()
            break;
    }
    player.pauseVideo()
});

function seekOther(roomnum, currTime) {
    socket.emit('seek other', {
        room: roomnum,
        time: currTime
    });
    // socket.emit('getData');
}


// Weird for YouTube because there is no built in seek event
// It seeks on an buffer event
// Only syncs if off by over .1 seconds
socket.on('justSeek', function(data) {
    console.log("Seeking Event!");
    currTime = data.time;
    switch (currPlayer) {
        case 0:
            var clientTime = player.getCurrentTime();
            if (clientTime < currTime - .1 || clientTime > currTime + .1) {
                player.seekTo(currTime);
                // Forces video to play right after seek
                player.playVideo()
            }
            break;
        case 1:
            var clientTime = dailyPlayer.currentTime;
            if (clientTime < currTime - .1 || clientTime > currTime + .1) {
                dailyPlayer.seek(currTime);
            }
            playOther(roomnum);
            break;
    }
});
