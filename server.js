//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081)
    , scrollback = 100;

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

var scrollbackBuffer = [];
var members = [];

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: {
            title : '404 - Not Found'
            ,description: ''
            ,author: ''
            ,analyticssiteid: 'XXXXXXX'
        },status: 404 });
    } else {
        res.render('500.jade', { locals: {
            title : 'The Server Encountered an Error'
            ,description: ''
            ,author: ''
            ,analyticssiteid: 'XXXXXXX'
            ,error: err
        },status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO
var io = io.listen(server);

io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);
});

io.sockets.on('connection', function(socket){
    console.log('Client Connected');

    // everyone starts off anon
    socket.username = 'anon';

    // send recent scrollbackBuffer
    for (var i = 0; i < scrollbackBuffer.length; i++)
        socket.emit('said', scrollbackBuffer[i]);

    socket.on('rename', function(data) {
        // remove old name from names
        if (socket.username) {
            for (var i = 0; i < members.length; i++)
                if (members[i] === socket.username) {
                    members.splice(i, 1);
                    break;
                }
        }
        data.name = socket.username;
        socket.username = data.newName;

        members.push(socket.username);
        socket.emit('members', members);
        socket.broadcast.emit('members', members);
    });

    socket.on('say', function(data){
        data.name = socket.username;

        // save data to scrollback and trim scrollback to size
        scrollbackBuffer.push(data);
        scrollbackBuffer = scrollbackBuffer.splice(-scrollback, scrollback);

        socket.broadcast.emit('said', data);

        data.mine = true;
        socket.emit('said', data);
    });

    socket.on('disconnect', function(){
        // remove old name from names
        if (socket.username) {
            for (var i = 0; i < members.length; i++)
                if (members[i] === socket.username) {
                    members.splice(i, 1);
                    break;
                }
        }
        socket.broadcast.emit('members', members);
        console.log('Client Disconnected.');
    });
});


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
    res.render('index.jade', {
        locals : {
            title : 'Your Page Title'
            ,description: 'Your Page Description'
            ,author: 'Your Name'
            ,analyticssiteid: 'XXXXXXX'
        }
    });
});

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );
