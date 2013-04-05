//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , crypto = require('crypto')
    , port = (process.env.PORT || 8000)
    , scrollback = 100
    , config = require('./config.json');

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "feed a bee"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

var scrollbackBuffer = {};
var members = {};

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: {
            title : '404 - Not Found'
            , description: ''
            , author: ''
            , analyticssiteid: 'XXXXXXX'
        }, status: 404 });
    } else {
        res.render('500.jade', { locals: {
            title : 'The Server Encountered an Error'
            , description: ''
            , author: ''
            , analyticssiteid: 'XXXXXXX'
            , error: err
        }, status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO
var io = io.listen(server);

// NOTE: uncomment this if people have problems with socket.io
// io.configure(function () {
//     io.set("transports", ["xhr-polling"]);
//     io.set("polling duration", 10);
// });

io.sockets.on('connection', function(socket){
    console.log('Client Connected');

    // everyone starts off anon
    socket.trip = { name: 'anon' };

    socket.on('subscribe', function(data) {
        // join socket to the room
        console.log('joining ' + socket.trip.name + '!' + socket.trip.code + ' to #' + data);
        socket.join('#' + data); // prepend # to prevent front page from being falsy and broadcasting everywhere
        socket.channel = '#' + data;

        scrollbackBuffer[socket.channel] = scrollbackBuffer[socket.channel] || [];

        // send recent scrollbackBuffer but don't send messages who's convo was hidden at the time they were sent
        for (var i = 0; i < scrollbackBuffer[socket.channel].length; i++)
            socket.emit('said', scrollbackBuffer[socket.channel][i]);
    });

    socket.on('rename', function(data) {
        // encrypt tripcode
        var trip = data.newName.split(/#(.+)/);
        trip = { name: trip[0], code: trip[1] };

        if (trip.code) {
                if (trip.code == config.modtrip)
                    trip.code = 'MOD';
                else
                    trip.code = crypto.createHmac('SHA256', config.salt).update(trip.code).digest('base64').substring(0, 6);
        } else {
            trip.code = '--';
        }

        members[socket.channel] = members[socket.channel] || [];

        // remove old name from names
        if (socket.trip) {
            for (var i = 0; i < members[socket.channel].length; i++)
                if (members[socket.channel][i].name === socket.trip.name && members[socket.channel][i].code === socket.trip.code) {
                    members[socket.channel].splice(i, 1);
                    break;
                }
        }

        socket.trip = trip;
        members[socket.channel].push(trip);
        socket.emit('members', members[socket.channel]);
        socket.broadcast.to(socket.channel).emit('members', members[socket.channel]);
    });

    socket.on('say', function(data){
        if (data.message.match(/^\s*$/))
            return;

        data.trip = socket.trip;
        data.time = new Date().getTime();

        scrollbackBuffer[socket.channel] = scrollbackBuffer[socket.channel] || [];

        // save data to scrollback and trim scrollback to size
        scrollbackBuffer[socket.channel].push(data);
        scrollbackBuffer[socket.channel] = scrollbackBuffer[socket.channel].splice(-scrollback, scrollback);

        socket.broadcast.to(socket.channel).emit('said', data);
        socket.emit('said', data);
    });

    socket.on('disconnect', function(){
        console.log('disconnecting ' + socket.trip.name + '!' + socket.trip.code + ' from ' + socket.channel);
        members[socket.channel] = members[socket.channel] || [];

        // remove old name from names
        if (socket.trip) {
            for (var i = 0; i < members[socket.channel].length; i++)
                if (members[socket.channel][i].name === socket.trip.name && members[socket.channel][i].code === socket.trip.code) {
                    members[socket.channel].splice(i, 1);
                    break;
                }
        }
        socket.broadcast.to(socket.channel).emit('members', members[socket.channel]);
        console.log('Client Disconnected.');
    });
});


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/*', function(req,res){
    res.render('index.jade', {
        locals : {
            title : config.title
            , description: ''
            , author: ''
            , analyticssiteid: 'XXXXXXX'
        }
    });
});

// uhm, nothing is ever not found...

////A Route for Creating a 500 Error (Useful to keep around)
//server.get('/500', function(req, res){
//    throw new Error('This is a 500 Error');
//});
//
////The 404 Route (ALWAYS Keep this as the last route)
//server.get('/*', function(req, res){
//    throw new NotFound;
//});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

console.log('Listening on http://0.0.0.0:' + port );
