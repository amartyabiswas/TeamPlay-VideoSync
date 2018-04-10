var currPlayer = 0;

// 0 - YouTube
// 1 - Daily Motion
// 2 - Vimeo

// Gets all the player data
socket.on('getPlayerData', function(data) {
    var roomnum = data.room;
    var caller = data.caller;

    switch (currPlayer) {
        case 0:
            var currTime = player.getCurrentTime();
            var state = playerStatus;
            socket.emit('get host data', {
                room: roomnum,
                currTime: currTime,
                state: state,
                caller: caller
            });
            break;
        case 1:
            var currTime = dailyPlayer.currentTime;
            var state = dailyPlayer.paused;
            socket.emit('get host data', {
                room: roomnum,
                currTime: currTime,
                state: state,
                caller: caller
            });
            break;
        default:
            console.log("Error invalid player id")
    }
});

// Create Youtube Player
socket.on('createYoutube', function(data) {
    if (currPlayer != 0) {
        // var playerIn = document.getElementById("playerArea")
        // console.log(playerIn.innerHTML)
        // playerIn.innerHTML = "<iframe id=\"player\"allowfullscreen=\"0\"width=\"640\" height=\"360\"src=\"https://www.youtube.com/embed/M7lc1UVf-VE?enablejsapi=1\"frameborder=\"0\"style=\"border: solid 4px #37474F\"></iframe>"
        // onYouTubeIframeAPIReady()

        var daily = document.getElementById('dailyArea');
        daily.style.display = 'none';

        var you = document.getElementById('playerArea');
        you.style.display = 'block';
        currPlayer = 0

        console.log("Player state: "+playerStatus)
        // If it is -1, there was an error and needs to resync to host
        if (playerStatus == -1) {
            socket.emit('get video', function(id) {
                player.loadVideoById(id);
                // Auto sync with host after 1000ms of changing video
                setTimeout(function() {
                    socket.emit('sync host', {});
                }, 1000);
            })
        }
    }
});

// Create Daily Motion Player
socket.on('createDaily', function(data) {
    console.log("i am in create daily")
    // player.destroy()
    if (currPlayer != 1) {
        //     var playerIn = document.getElementById("playerArea")
        //     console.log(playerIn.innerHTML)
        //     playerIn.innerHTML = "<iframe id=\"player-daily\" frameborder=\"0\" width=\"640\" height=\"360\"src=\"//www.dailymotion.com/embed/video/x26m1j4\"allowfullscreen allow=\"autoplay\"></iframe>"

        var you = document.getElementById('playerArea');
        you.style.display = 'none';

        var daily = document.getElementById('dailyArea');
        daily.style.display = 'block';
        currPlayer = 1

        // Special call to pause youtube player
        // Only have to do on youtube player as it is the default player that autoplays
        player.pauseVideo();
    }
});
