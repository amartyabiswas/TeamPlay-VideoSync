let express = require('express');
let path= require('path');
let app = express();
let port = process.env.PORT|| 5000;
let bodyParser=require('body-parser');
let cookieParser=require('cookie-parser');
let server = require('http').createServer(app);
let io = require('socket.io').listen(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set given room for url parameter
let given_room = "";
users = [];
connections = [];
rooms = [];
// Store all of the sockets and their respective room numbers
userrooms = {};


server.listen(port, function () {
   console.log('Magic happens at port '+ port);
});

app.get('/:room', function(req, res) {
    given_room = req.params.room;
    res.sendFile(path.join(__dirname,'./public/index.html'));
});


let roomno = 1;

io.sockets.on('connection', function(socket) {
    // Connect Socket
    connections.push(socket);
    console.log('Connected: %s sockets connected', connections.length);

    // Set default room, if provided in url
    socket.emit('set id', {
        id: given_room
    })

    socket.emit('available rooms', {
        userrooms,
        id: socket.id
    })

    socket.on('reset url', function(data) {
        given_room = ""
    });

    // Play video
    socket.on('play video', function(data) {
        var roomnum = data.room
        io.sockets.in("room-" + roomnum).emit('playVideoClient');
    });

    socket.on('play other', function(data) {
        var roomnum = data.room
        io.sockets.in("room-" + roomnum).emit('justPlay');
    });

    socket.on('pause other', function(data) {
        var roomnum = data.room
        io.sockets.in("room-" + roomnum).emit('justPause');
    });

    socket.on('seek other', function(data) {
        var roomnum = data.room
        var currTime = data.time
        io.sockets.in("room-" + roomnum).emit('justSeek', {
            time: currTime
        });
    });

    // Sync video
    socket.on('sync video', function(data) {
        var roomnum = data.room
        var currTime = data.time
        var state = data.state
        var videoId = data.videoId
        var playerId = io.sockets.adapter.rooms['room-' + roomnum].currPlayer
        io.sockets.in("room-" + roomnum).emit('syncVideoClient', {
            time: currTime,
            state: state,
            videoId: videoId,
            playerId: playerId
        });
    });

    // Change video
    socket.on('change video', function(data, callback) {
        var roomnum = data.room
        var videoId = data.videoId
        var time = data.time
        var host = io.sockets.adapter.rooms['room-' + socket.roomnum].host

        // This changes the room variable to the video id
        // io.sockets.adapter.rooms['room-' + roomnum].currVideo = videoId
        switch (io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer) {
            case 0:
                // Set prev video before changing
                io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.yt.id = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.yt
                io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.yt.time = time
                // Set new video id
                io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.yt = videoId
                break;
            case 1:
                // Set prev video before changing
                io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.dm.id = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.dm
                io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.dm.time = time
                // Set new video id
                io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.dm = videoId
                break;
            default:
                console.log("Error invalid player id")
        }
        io.sockets.in("room-" + roomnum).emit('changeVideoClient', {
            videoId: videoId
        });

        // If called from previous video, do a callback to seek to the right time
        if (data.prev) {
            // Call back to return the video id
            callback()
        };
    });

    // Change to previous video
    socket.on('change previous video', function(data, callback) {
        var roomnum = data.room
        var host = io.sockets.adapter.rooms['room-' + socket.roomnum].host

        // This sets the videoId to the proper previous video
        switch (io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer) {
            case 0:
                var videoId = io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.yt.id
                var time = io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.yt.time
                break;
            case 1:
                var videoId = io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.dm.id
                var time = io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo.dm.time
                break;
            default:
                console.log("Error invalid player id")
        }

        console.log("Hot Swapping to Previous Video: "+videoId+" at current time: "+time)
        // Callback to go back to client to request the video change
        callback({
            videoId: videoId,
            time: time
        })
    });

    // Get video id based on player
    socket.on('get video', function(callback) {
        // Gets current video from room variable
        switch (io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer) {
            case 0:
                var currVideo = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.yt
                break;
            case 1:
                var currVideo = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.dm
                break;
            default:
                console.log("Error invalid player id")
        }
        // Call back to return the video id
        callback(currVideo)
    });

    // Change video player
    socket.on('change player', function(data) {
        var roomnum = data.room
        var playerId = data.playerId

        io.sockets.in("room-" + roomnum).emit('pauseVideoClient');

        switch (playerId) {
            case 0:
                io.sockets.in("room-" + roomnum).emit('createYoutube', {});
                break;
            case 1:
                io.sockets.in("room-" + roomnum).emit('createDaily', {});
                break;
            default:
                console.log("Error invalid player id")
        }

        // This changes the room variable to the player id
        io.sockets.adapter.rooms['room-' + roomnum].currPlayer = playerId
        console.log(io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer)

        // This syncs the host whenever the player changes
        host = io.sockets.adapter.rooms['room-' + socket.roomnum].host
        socket.broadcast.to(host).emit('getData');

    });

    // Change video player
    socket.on('change single player', function(data) {
        var playerId = data.playerId

        switch (playerId) {
            case 0:
                socket.emit('createYoutube', {});
                break;
            case 1:
                socket.emit('createDaily', {});
                break;
            default:
                console.log("Error invalid player id")
        }
        // After changing the player, resync with the host
        host = io.sockets.adapter.rooms['room-' + socket.roomnum].host
        socket.broadcast.to(host).emit('getData');
    });



    // Disconnect
    socket.on('disconnect', function(data) {

        // If socket username is found
        if (users.indexOf(socket.username) != -1) {
            users.splice((users.indexOf(socket.username)), 1);
            updateUsernames();
        }

        connections.splice(connections.indexOf(socket), 1);
        console.log(socket.id + ' Disconnected: %s sockets connected', connections.length);

        // Grabs room from userrooms data structure
        var id = socket.id
        var roomnum = userrooms[id]
        var room = io.sockets.adapter.rooms['room-' + roomnum]

        // If you are not the last socket to leave
        if (room !== undefined) {
            // If you are the host
            if (socket.id == room.host) {
                // Reassign
                console.log("hello i am the host " + socket.id + " and i am leaving my responsibilities to " + Object.keys(room.sockets)[0])
                io.to(Object.keys(room.sockets)[0]).emit('autoHost', {
                    roomnum: roomnum
                })
            }

            // Remove from users list
            // If socket username is found
            if (room.users.indexOf(socket.username) != -1) {
                room.users.splice((room.users.indexOf(socket.username)), 1);
                updateRoomUsers(roomnum);
            }
        }

        // Delete socket from userrooms
        delete userrooms[id]
    });

    // Send Message in chat
    socket.on('send message', function(data) {
        var encodedMsg = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // console.log(data);
        io.sockets.emit('new message', {
            msg: encodedMsg,
            user: socket.username
        });
    });

    // New User
    socket.on('new user', function(data, callback) {
        callback(true);
        // Data is username
        var encodedUser = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        socket.username = encodedUser;
        //console.log(socket.username)
        users.push(socket.username);
        updateUsernames();
    });

    // New room
    socket.on('new room', function(data, callback) {
        //callback(true);
        // Roomnum passed through
        socket.roomnum = data;

        // This stores the room data for all sockets
        userrooms[socket.id] = data

        var host = null
        var init = false

        // Sets default room value to 1
        if (socket.roomnum == null || socket.roomnum == "") {
            socket.roomnum = '1'
            userrooms[socket.id] = '1'
        }

        // Adds the room to a global array
        if (!rooms.includes(socket.roomnum)) {
            rooms.push(socket.roomnum);
        }

        // Checks if the room exists or not
        // console.log(io.sockets.adapter.rooms['room-' + socket.roomnum] !== undefined)
        if (io.sockets.adapter.rooms['room-' + socket.roomnum] === undefined) {
            socket.send(socket.id)
            // Sets the first socket to join as the host
            host = socket.id
            init = true

            // Set the host on the client side
            socket.emit('setHost');
            //console.log(socket.id)
        } else {
            console.log(socket.roomnum)
            host = io.sockets.adapter.rooms['room-' + socket.roomnum].host
        }

        // Actually join the room
        console.log(socket.username + " connected to room-" + socket.roomnum)
        socket.join("room-" + socket.roomnum);

        // Sets the default values when first initializing
        if (init) {
            // Sets the host
            io.sockets.adapter.rooms['room-' + socket.roomnum].host = host
            // Default Player
            io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer = 0
            // Default video
            io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo = {
                yt: 'xpyrefzvTpI',
                dm: 'x4xl2av',
            };
            // Previous Video
            io.sockets.adapter.rooms['room-' + socket.roomnum].prevVideo = {
                yt: {
                    id: 'xpyrefzvTpI',
                    time: 0
                },
                dm: {
                    id: 'x4xl2av',
                    time: 0
                }
            };
            // Host username
            io.sockets.adapter.rooms['room-' + socket.roomnum].hostName = socket.username
            // Keep list of online users
            io.sockets.adapter.rooms['room-' + socket.roomnum].users = [socket.username]
        }

        // Set Host label
        io.sockets.in("room-" + socket.roomnum).emit('changeHostLabel', {
            username: io.sockets.adapter.rooms['room-' + socket.roomnum].hostName
        });

        // Gets current video from room variable
        switch (io.sockets.adapter.rooms['room-' + socket.roomnum].currPlayer) {
            case 0:
                var currVideo = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.yt
                break;
            case 1:
                var currVideo = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.dm
                break;
            default:
                console.log("Error invalid player id")
        }
        var currYT = io.sockets.adapter.rooms['room-' + socket.roomnum].currVideo.yt

        // Change the video to current One
        socket.emit('changeVideoClient', {
            videoId: currVideo
        });

        // Get time from host which calls change time for that socket
        if (socket.id != host) {
            //socket.broadcast.to(host).emit('getTime', { id: socket.id });
            console.log("call the damn host " + host)

            // Set a timeout so the video can load before it syncs
            setTimeout(function() {
                socket.broadcast.to(host).emit('getData');
            }, 1000);

            // Push to users in the room
            io.sockets.adapter.rooms['room-' + socket.roomnum].users.push(socket.username)
        } else {
            console.log("I am the host")
            //socket.emit('auto sync');

            // Auto syncing is not working atm
            // socket.broadcast.to(host).emit('auto sync');
        }

        // Update online users
        updateRoomUsers(socket.roomnum)
    });

    // Changes time for a specific socket
    socket.on('change time', function(data) {
        // console.log(data);
        var caller = data.id
        var time = data.time
        socket.broadcast.to(caller).emit('changeTime', {
            time: time
        });
    });

    // This just calls the syncHost function
    socket.on('sync host', function(data) {
        //socket.broadcast.to(host).emit('syncVideoClient', { time: time, state: state, videoId: videoId });
        var host = io.sockets.adapter.rooms['room-' + socket.roomnum].host
        // If not host, recall it on host
        if (socket.id != host) {
            socket.broadcast.to(host).emit('getData')
        } else {
            socket.emit('syncHost')
        }
    });

    // Emits the player status
    socket.on('player status', function(data) {
        // console.log(data);
        console.log(data)
    });

    // Update all users
    function updateUsernames() {
        // io.sockets.emit('get users', users);
        // console.log(users)
    }

    // Update the room usernames
    function updateRoomUsers(roomnum) {
        var roomUsers = io.sockets.adapter.rooms['room-' + socket.roomnum].users
        io.sockets.in("room-" + roomnum).emit('get users', roomUsers);
    }

    // Change host
    socket.on('change host', function(data) {
        var roomnum = data.room
        var newHost = socket.id
        var currHost = io.sockets.adapter.rooms['room-' + socket.roomnum].host

        // If socket is already the host!
        if (newHost != currHost) {
            console.log("I want to be the host and my socket id is: " + newHost);
            //console.log(io.sockets.adapter.rooms['room-' + socket.roomnum])

            // Broadcast to current host and set false
            socket.broadcast.to(currHost).emit('unSetHost');
            // Reset host
            io.sockets.adapter.rooms['room-' + socket.roomnum].host = newHost
            // Broadcast to new host and set true
            socket.emit('setHost')

            io.sockets.adapter.rooms['room-' + socket.roomnum].hostName = socket.username
            // Update host label in all sockets
            io.sockets.in("room-" + roomnum).emit('changeHostLabel', {
                username: socket.username
            });
        }

    });

    // Get host data
    socket.on('get host data', function(data) {
        var roomnum = data.room
        var host = io.sockets.adapter.rooms['room-' + roomnum].host

        // Checks if it has the data, if not get the data and recursively call again
        if (data.currTime === undefined) {
            // Saves the original caller so the host can send back the data
            var caller = socket.id
            socket.broadcast.to(host).emit('getPlayerData', {
                room: roomnum,
                caller: caller
            })
        } else {
            var caller = data.caller
            // Call necessary function on the original caller
            socket.broadcast.to(caller).emit('compareHost', data);
        }

    });

    //------------------------------------------------------------------------------
    // Async get current time
    socket.on('auto sync', function(data) {
        var async = require("async");
        var http = require("http");

        //Delay of 5 seconds
        var delay = 5000;

        async.forever(

            function(next) {
                console.log("i am auto syncing")
                socket.emit('syncHost');

                //Repeat after the delay
                setTimeout(function() {
                    next();
                }, delay)
            },
            function(err) {
                console.error(err);
            }
        );
    });

});
//...........................ERROR HANDLING........................................

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
